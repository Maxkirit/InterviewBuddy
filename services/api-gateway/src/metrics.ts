import { registerService, Metrics } from "./shared/shared_metrics.js";
import {Request, Response, NextFunction} from 'express';

const { register, httpRequestsTotal, httpRequestDurationSeconds, httpRequestsInFlight } = registerService('api-gateway');

//start timing metrics and populating the fields we want in the middleware
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/v1/monitoring')
        return next();

    const end = httpRequestDurationSeconds.startTimer();
    httpRequestsInFlight.inc({method: req.method});

    res.on('finish', () => {
        const route = req.route?.path ?? req.path; //allows use of route path for better cardinality when :userId baked in route

        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
        };

        httpRequestsTotal.inc(labels);
        end(labels);
        httpRequestsInFlight.dec({ method: req.method });
    });

    next();
}

export async function monitor(req: Request, res: Response) {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
}