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

    // Profile operations
    const profileUpdateTotal = new promClient.Counter({
        name: 'user_profile_update_total',
        help: 'Profile update operations',
        labelNames: ['field_group'] as const, //labels of our profile page (DoB, job, organization, etc)
        registers: [register],
    });

    const activeConnectionsGauge = new promClient.Gauge({
        name: 'user_active_connections_total',
        help: 'Total accepted connections in the graph',
        registers: [register],
    });

    //active users per 30s (heartbeat duration)

    return { register,
        httpRequestDurationSeconds,
        httpRequestsTotal,
        httpRequestsInFlight,
        profileUpdateTotal,
        activeConnectionsGauge,
    }
}


export const { register,
        httpRequestDurationSeconds,
        httpRequestsTotal,
        httpRequestsInFlight,
        profileUpdateTotal,
        activeConnectionsGauge,
    } = registerService('api-gateway');

type RouteEvent = {
    successEvent?: (req: Request, res: Response) => void;
    failureEvent?: (req: Request, res: Response) => void;
    failureReason?: string,
}

const ROUTE_EVENT_MAP: Record<string, RouteEvent> = {
    // 'PATCH /user/profile/:user_id': {
    //     successEvent: profileUpdateTotal.inc()
    // }
}

//start timing metrics and populating the fields we want in the middleware
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/v1/monitoring')
        return next();

    const end = httpRequestDurationSeconds.startTimer();
    httpRequestsInFlight.inc({method: req.method});

    

    res.on('finish', () => {
        const route = req.route?.path ?? req.path;
        const statusCode = res.statusCode;
        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
        };

        if (route === '/user/:user_id/delete')
            activeConnectionsGauge.dec(1);
        if (route === '/user/connections/:user_id/:connectionId')
            activeConnectionsGauge.inc(1);
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