import express from 'express';
import { validateAcccessToken } from './validateToken.js'
import cookieParser from 'cookie-parser';
import cors from 'cors'; //used to add a header to response so frontend is happy
import authRoute from './router/auth.route.js';
import protectedAuthRoute from './router/protected-auth.route.js';

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

app.use('/api/v1/auth', authRoute)

// signup before validateAcccessToken
app.use(validateAcccessToken);
// other routes after (needs verification) 

app.use('/api/v1/auth', protectedAuthRoute)

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})