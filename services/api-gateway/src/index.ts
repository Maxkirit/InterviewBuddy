import express from 'express';
import { validateAcccessToken } from './validateToken.js'
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoute from './router/auth.route.js';
import userRoute from './router/user.route.js'

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

// app.use('/api/v1/auth',authRoute)
// // signup before validateAcccessToken
// app.use(validateAcccessToken);
// other routes after (needs verification) 

app.use('/api/v1/user', userRoute)

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})