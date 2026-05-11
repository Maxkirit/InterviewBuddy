import express from 'express';
import { validateAcccessToken } from './validateToken.js'
import cookieParser from 'cookie-parser';
import cors from 'cors'; //used to add a header to response so frontend is happy
import authRoute from './router/auth.route.js';
import userRoute from './router/user.route.js'
import protectedAuthRoute from './router/protected-auth.route.js';
import interviewRoute from './router/interview.route.js';

export type ApiError = {
  message: string;
  code: number;
};

const app = express();
const port = 3000;

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
}));

// Middleware to parse request body into json
app.use(express.json());
// middleware for cookie parsing
app.use(cookieParser());

app.use('/api/v1/auth',authRoute);
// // signup before validateAcccessToken
app.use(validateAcccessToken);
// // other routes after (needs verification) 

app.use('/api/v1/auth', protectedAuthRoute);
app.use('/api/v1/user', userRoute);
app.use('/api/v1/interview', interviewRoute);

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})