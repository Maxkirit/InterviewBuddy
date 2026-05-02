import express from 'express';
import axios from 'axios';
import { string, z } from 'zod';
import cookieParser from 'cookie-parser';

type ApiError = {
  message: string;
  code: number;
};

const Login = z.object({
    email: z.email(),
    password: z.string().min(1),
});

const app = express();
const port = 3000;

// Middleware to parse request body into json
app.use(express.json());
// middleware for cookie parsing
app.use(cookieParser());

app.post('/api/v1/auth/login', async (req, res) => {
    const result = Login.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({error: "Bad request"});
    }
    try {
        const response = await axios.post("http://svc-auth:3000/api/v1/request-auth", {
            email: result.data.email,
            password: result.data.password,
        })
        res.status(200);
        res.cookie("refreshToken", response.data.refreshToken, {httpOnly: true, secure:  true, sameSite: "strict", maxAge: response.data.max_age}); //validity as cookie header, must be controlled by auth
        return res.json({accessToken: response.data.accessToken, message: "Login succesful"});
    } catch(error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({error: error.response.data.message});
        } else {
            return res.status(502).json({error: "Bad gateway"});
        }
    }
})

app.get("/api/v1/auth/refresh", async(req, res) => {
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
        res.cookie("refreshToken", result.data.refreshToken, {httpOnly: true, secure:  true, sameSite: "strict", maxAge: result.data.refreshMaxAge});
        return res.cookie("refreshToken", oldRefreshToken, {httpOnly: true, secure:  true, sameSite: "strict", maxAge: -1}); //invalidates old token
    } catch (error){
        if (axios.isAxiosError<ApiError>(error) && error.response?.status){
            return res.status(error.response.status).json({error: error.response.data.message});
        } else {
            return res.status(502).json({error: "Bad gateway"});
        }
    }
})

app.get("/api/v1/auth/logout", async(req, res) => {
    // use expired refresh token for identity. That's why we should only send a maxAge == -1 AFTER logout or with another refresh token.
    if (Object.keys(req.cookies).length === 0 || !req.cookies['refreshToken']){ 
        return res.status(404).json({error: "refresh token not found"});
    }
    const refreshToken = req.cookies['refreshToken'];
    try{
        const response = await axios.post("http://svc-auth:3000/api/v1/svc-auth/logout", {
            refreshToken: refreshToken,
        });
        res.cookie("refreshToken", refreshToken, {httpOnly: true, secure: true, sameSite: "strict", maxAge: -1});
        res.json({message: 'Logout successful'});
        return res.status(200);
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status){
            return res.status(error.response.status).json({error: error.response.data.message});
        } else {
            return res.status(502).json({error: "Bad gateway"});
        } 
    }
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})