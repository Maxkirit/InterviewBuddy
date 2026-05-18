import promClient from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const  register = new promClient.Registry();
register.setDefaultLabels({
    app: 'svc-user',
});
promClient.collectDefaultMetrics({register});

//build a middleware for monitoring

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

//HTTP request counter
export const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

//Request duration histogram
export const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register],
});

//current requests processed
export const httpRequestsInFlight = new promClient.Gauge({
    name: 'http_requests_in_flight',
    help: 'Number of HTTP requests currently being processed',
    labelNames: ['method'],
    registers: [register],
});