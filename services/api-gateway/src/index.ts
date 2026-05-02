import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { validateAcccessToken } from './validateToken.js'
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
app.use(express.json())
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
        res.cookie("refresh_token", response.data.refresh_token, {httpOnly: true, secure:  true, sameSite: "strict"});
        res.json({access_token: response.data.access_token});
    } catch(error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({error: error.response.data.message});
        } else {
            return res.status(502).json({error: "Bad gateway"});
        }
    }
})

// signup before validateAcccessToken
app.use(validateAcccessToken);
// other routes after (needs verification) 

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})