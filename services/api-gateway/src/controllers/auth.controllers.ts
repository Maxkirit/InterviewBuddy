import { Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { ApiError } from '../index.js';

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const login = async (req: Request, res: Response) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Bad request' });
  }
  try {
    const response = await axios.post('http://svc-auth:3000/auth/auth-request', {
      email: result.data.email,
      password: result.data.password,
    });
    console.log(response.data.refreshToken);
    res.cookie('refreshToken', response.data.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: response.data.maxAge,
    });
    return res.status(200).json({ accessToken: response.data.accessToken, message: 'Login successful' });
  } catch (error) {
    if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
      return res.status(error.response.status).json({error: error.response.data?.error ?? error.message});
    }
    return res.status(502).json({ error: 'Bad gateway' });
  }
};

export const refresh = async (req: Request, res: Response) =>{
  console.log(req);
	console.log(req.cookies.refreshToken);
	if (Object.keys(req.cookies).length === 0 || !req.cookies['refreshToken']){ //used to be JSON.stringify(req.cookies) === '{}' but checking if object has keys is cleaner
		console.log("no refresh cookie header\n"); //res.send() closes the HTTP connection but without return code keeps gind --> error
		return res.status(404).json({error: "refresh token not found"});
	}
	const oldRefreshToken = req.cookies.refreshToken; //store so we can send back with max_age==-1 to invalidate old ones in browser
	try {
		const result = await axios.post("http://svc-auth:3000/auth/refresh-token", {
			refreshToken: oldRefreshToken,
		});
    res.cookie("refreshToken", result.data.refreshToken, {httpOnly: true, secure:  true, sameSite: "strict", maxAge: result.data.refreshMaxAge});
		return res.json({accessToken: result.data.accessToken, message: 'Refresh successful'});
	} catch (error){
		if (axios.isAxiosError<ApiError>(error) && error.response?.status){
			return res.status(error.response.status).json({error: error.response.data?.error ?? error.message});
		} else {
			return res.status(502).json({error: "Bad gateway"});
		}
	}
};

export const logout = async (req: Request, res: Response) =>{
	// use expired refresh token for identity. That's why we should only send a maxAge == -1 AFTER logout or with another refresh token.
	if (Object.keys(req.cookies).length === 0 || !req.cookies['refreshToken']){ 
		return res.status(404).json({error: "refresh token not found"});
	}
	const refreshToken = req.cookies['refreshToken'];
	try{
		const response = await axios.patch("http://svc-auth:3000/auth/revoke/refresh-token", { //returns userId
			refreshToken: refreshToken,
		});
		//post message to RabbitMQ
		res.cookie("refreshToken", refreshToken, {httpOnly: true, secure: true, sameSite: "strict", maxAge: -1});
		return res.status(200).json({message: 'Logout successful'});
	} catch (error) {
		if (axios.isAxiosError<ApiError>(error) && error.response?.status){
			return res.status(error.response.status).json({error: error.response.data?.error ?? error.message});
		} else {
			return res.status(502).json({error: "Bad gateway"});
		} 
	}
}

export const registrationFlow = async (req: Request, res: Response) => {
    const REQUIRED_FIELDS = [
        'email', 'password', 'name', 'surname', 'role_type'
    ] as const;
	console.log(req.body);
    const missingFields = REQUIRED_FIELDS.filter(field => !req.body[field]);
    if (missingFields.length > 0){
        return res.status(400).json({error: 'Missing fields in request', missing: missingFields});
    }
    try {
        const response = await axios.post("http://svc-auth:3000/auth/user", {
            email: req.body['email'],
            password: req.body['password'],
            name: req.body['name'],
            surname: req.body['surname'],
            role_type: req.body['role_type'],
        });
        res.cookie('refreshToken', response.data.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: response.data.maxAge,
        });
        return res.status(203).json({accessToken: response.data.accessToken, message: "User created"});
    } catch (error) {
        console.log("registration flow error path\n");
        if (axios.isAxiosError<ApiError>(error) && error.response?.status){
            if (error.response.status === 409){
                return res.status(error.response.status).json({error: 'User already registered'});
            }
            console.log("different axios error\n");
            return res.status(error.response.status).json({error: error.response.data?.error ?? error.message});
        }
        return res.status(502).json({error: "Bad gateway"});
    }
}
