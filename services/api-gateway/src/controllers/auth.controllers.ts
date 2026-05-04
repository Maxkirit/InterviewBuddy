import { Request, Response } from 'express';
import axios from 'axios';
import { z } from 'zod';

type ApiError = {
  message: string;
  code: number;
};

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const login = async (req: Request, res: Response) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Bad request' });
  }
  try {
    const response = await axios.post('http://svc-auth:3000/api/v1/request-auth', {
      email: result.data.email,
      password: result.data.password,
    });
    res.cookie('refreshToken', response.data.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: response.data.max_age,
    });
    return res.status(200).json({ accessToken: response.data.accessToken, message: 'Login successful' });
  } catch (error) {
    if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
      return res.status(error.response.status).json({ error: error.response.data.message });
    }
    return res.status(502).json({ error: 'Bad gateway' });
  }
};

export const refresh = async (req: Request, res: Response) =>{
	console.log(req.cookies);
	if (Object.keys(req.cookies).length === 0 || !req.cookies['refreshToken']){ //used to be JSON.stringify(req.cookies) === '{}' but checking if object has keys is cleaner
		console.log("no refresh cookie header\n"); //res.send() closes the HTTP connection but without return code keeps gind --> error
		return res.status(404).json({error: "refresh token not found"});
	}
	const oldRefreshToken = req.cookies['refreshToken']; //store so we can send back with max_age==-1 to invalidate old ones in browser
	try {
		const result = await axios.post("http://svc-auth:3000/api/v1/svc-auth/refresh-token", {
			refreshToken: oldRefreshToken,
		});
		res.json({accessToken: result.data.accessToken, message: 'Refresh successful'});
		return res.cookie("refreshToken", result.data.refreshToken, {httpOnly: true, secure:  true, sameSite: "strict", maxAge: result.data.refreshMaxAge});
	} catch (error){
		if (axios.isAxiosError<ApiError>(error) && error.response?.status){
			return res.status(error.response.status).json({error: error.response.data.message});
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
		const response = await axios.post("http://svc-auth:3000/api/v1/svc-auth/revoke-token", { //returns userId
			refreshToken: refreshToken,
		});
		//post message to RabbitMQ
		res.cookie("refreshToken", refreshToken, {httpOnly: true, secure: true, sameSite: "strict", maxAge: -1});
		return res.status(200).json({message: 'Logout successful'});
	} catch (error) {
		if (axios.isAxiosError<ApiError>(error) && error.response?.status){
			return res.status(error.response.status).json({error: error.response.data.message});
		} else {
			return res.status(502).json({error: "Bad gateway"});
		} 
	}
}