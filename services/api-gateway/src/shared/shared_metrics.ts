import promClient from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export function registerService(serviceName: string) {
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

    return { register,
        httpRequestDurationSeconds,
        httpRequestsTotal,
        httpRequestsInFlight
    }

}

export type Metrics = ReturnType<typeof registerService>;