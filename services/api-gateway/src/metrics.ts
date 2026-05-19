import promClient from 'prom-client';
import {Request, Response, NextFunction} from 'express';

function registerService(serviceName: string) {
    const register = new promClient.Registry();
    register.setDefaultLabels({ app: serviceName });
    promClient.collectDefaultMetrics({register});

    //add all metric objects here:
    //total http requests
    const httpRequestsTotal = new promClient.Counter({ 
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'] as const, //as const such that when exporting type, the strings are hardcoded instead of interpreted as string[]
        registers: [register],
    })

    //histogram of requests duration
    const httpRequestDurationSeconds = new promClient.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'] as const,
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
        registers: [register],
    });

    //current requests being handled
    const httpRequestsInFlight = new promClient.Gauge({
        name: 'http_requests_in_flight',
        help: 'Number of HTTP requests currently being processed',
        labelNames: ['method'] as const,
        registers: [register],
    });

    //add other metric objects here
    const avatarUploadTotal = new promClient.Counter({
        name: 'user_avatar_upload_total',
        help: 'Profile picture upload outcomes',
        labelNames: ['result'], // 'success' | 'too_large' | 'invalid_type'
        registers: [register],
    });

    const avatarUploadSizeBytes = new promClient.Histogram({
        name: 'user_avatar_upload_size_bytes',
        help: 'Size distribution of uploaded avatars',
        buckets: [50_000, 100_000, 500_000, 1_000_000, 2_000_000, 5_000_000],
        registers: [register],
    });

    return { register,
        httpRequestDurationSeconds,
        httpRequestsTotal,
        httpRequestsInFlight,
        avatarUploadTotal,
        avatarUploadSizeBytes
        //dont forget to add other objects
    }
}


export const { register, httpRequestsTotal, httpRequestDurationSeconds, httpRequestsInFlight, avatarUploadTotal, avatarUploadSizeBytes } = registerService('api-gateway');

//start timing metrics and populating the fields we want in the middleware
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/v1/monitoring')
        return next();

    const end = httpRequestDurationSeconds.startTimer();
    httpRequestsInFlight.inc({method: req.method});

    res.on('finish', () => {
        const route = req.route?.path ?? req.path; //allows use of route path for better cardinality when :userId baked in route
        if (res.statusCode == 413)
            avatarUploadTotal.inc({result: "too_large"});
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
    console.log("in monitoring");
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
}