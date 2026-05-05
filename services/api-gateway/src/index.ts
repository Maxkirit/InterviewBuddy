import express from 'express';
import axios from 'axios';
import { string, z } from 'zod';
import { validateAcccessToken } from './validateToken.js'
import cookieParser from 'cookie-parser';
import cors from 'cors';

type ApiError = {
  message: string;
  code: number;
};


const app = express();
const port = 3000;

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

// Middleware to parse request body into json
app.use(express.json());
// middleware for cookie parsing
app.use(cookieParser());

app.post('/api/v1/auth/login', async (req, res) => {
    if (Object.keys(req.body).length == 0 || !req.body['email'] || !req.body['password']){
        return res.status(400).json({error: 'Missing login info'});
    }
    try {
        const response = await axios.post("http://svc-auth:3000/auth/auth-request", {
            email: req.body.email,
            password: req.body.password,
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

//registration flow
app.post("/api/v1/auth/registration", async(req, res) => {
    if (Object.keys(req.body).length == 0 || !req.body['email'] || !req.body['password'] || !req.body['name'] || !req.body['surname']){
        return res.status(400).json({error: 'Missing signup info'});
    }
    try {
        //auth will call svc-user to create user and return userid baked in access and refresh token
        //auth then creates access token and returns it here
        const response = await axios.post("http://svc-auth:3000/auth/user", {
            email: req.body['email'],
            password: req.body['password'],
            name: req.body['name'],
            surname: req.body['surname'],
            role_type: req.body['role_type'], //'recruiter' or 'candidate' or 'admin'
        });
        res.cookie('refreshToken', response.data.refreshToken, {httpOnly: true, secure: true, sameSite: 'strict', maxAge: response.data.refreshMaxAge }); 
        //return 201 to client and client queries updateProfile()
        return res.status(201).json({accessToken: response.data.accessToken, message: "User registration succesful"});
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status){
            if (error.response.status === 409){
                return res.status(error.response.status).json({error: 'User already registered'});
            }
            return res.status(error.response.status).json({error: error.response.data.message});
        }
        return res.status(502).json({error: "Bad gateway"});
    }
})

// signup before validateAcccessToken
app.use(validateAcccessToken);
// other routes after (needs verification) 

app.get("/api/v1/auth/refresh", async(req, res) => {
    console.log(req.cookies);
    if (Object.keys(req.cookies).length === 0 || !req.cookies['refreshToken']){ //used to be JSON.stringify(req.cookies) === '{}' but checking if object has keys is cleaner
        console.log("no refresh cookie header\n"); //res.send() closes the HTTP connection but without return code keeps gind --> error
        return res.status(404).json({error: "refresh token not found"});
    }
    const oldRefreshToken = req.cookies['refreshToken']; //store so we can send back with max_age==-1 to invalidate old ones in browser
    try {
        const result = await axios.post("http://svc-auth:3000/auth/refresh-token", {
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
})

//close SSE connections, propagate logout state after refresh token validation
app.get("/api/v1/auth/logout", async(req, res) => {
    // use expired refresh token for identity. That's why we should only send a maxAge == -1 AFTER logout or with another refresh token.
    if (Object.keys(req.cookies).length === 0 || !req.cookies['refreshToken']){ 
        return res.status(404).json({error: "refresh token not found"});
    }
    const refreshToken = req.cookies['refreshToken'];
    try{
        const response = await axios.patch("http://svc-auth:3000/auth/refresh-token", { //returns userId
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
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})