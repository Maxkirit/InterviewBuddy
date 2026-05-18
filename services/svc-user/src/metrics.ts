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

    
    // Profile operations
    const profileUpdateTotal = new promClient.Counter({
        name: 'user_profile_update_total',
        help: 'Profile update operations',
        labelNames: ['field_group'] as const, //labels of our profile page (DoB, job, organization, etc)
        registers: [register],
    });

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
    // Social graph — connections between candidates and recruiters
    const connectionRequestTotal = new promClient.Counter({
        name: 'user_connection_request_total',
        help: 'Connection requests by actor pair and outcome',
        labelNames: ['initiator_role', 'target_role', 'result'] as const, // roles: 'candidate' | 'recruiter', result: 'sent' | 'accepted' | 'rejected' | 'withdrawn'
        registers: [register],
    });

    const activeConnectionsGauge = new promClient.Gauge({
        name: 'user_active_connections_total',
        help: 'Total accepted connections in the graph',
        labelNames: ['pair_type'] as const, // 'candidate_recruiter' | 'candidate_candidate'
        registers: [register],
    });

    //active users per 30s (heartbeat duration)

    return { register,
        httpRequestDurationSeconds,
        httpRequestsTotal,
        profileUpdateTotal,
        avatarUploadTotal,
        avatarUploadSizeBytes,
        connectionRequestTotal,
        activeConnectionsGauge,
    }
}


const { register,
        httpRequestDurationSeconds,
        httpRequestsTotal,
        profileUpdateTotal,
        avatarUploadTotal,
        avatarUploadSizeBytes,
        connectionRequestTotal,
        activeConnectionsGauge,
    } = registerService('api-gateway');

//start timing metrics and populating the fields we want in the middleware
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/v1/monitoring')
        return next();

    const end = httpRequestDurationSeconds.startTimer();

    res.on('finish', () => {
        const route = req.route?.path ?? req.path; //allows use of route path for better cardinality when :userId baked in route

        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
        };

        httpRequestsTotal.inc(labels);
        end(labels);
    });

    next();
}

export async function monitor(req: Request, res: Response) {
    console.log("in monitoring");
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
}