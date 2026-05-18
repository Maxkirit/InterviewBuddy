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

    // Token operations
    const tokenIssuedTotal = new promClient.Counter({
        name: 'auth_tokens_issued_total',
        help: 'Tokens issued by type',
        labelNames: ['token_type'] as const, // 'access' | 'refresh'
        registers: [register],
    });

    const tokenRevocationTotal = new promClient.Counter({
        name: 'auth_token_revocation_total',
        help: 'Token revocations by trigger',
        registers: [register],
    });

    const activeRefreshTokens = new promClient.Gauge({
        name: 'auth_active_refresh_tokens',
        help: 'Estimated active refresh token sessions (from Redis)',
        registers: [register],
    });

    // OAuth / 3rd party
    const oauthFlowTotal = new promClient.Counter({
        name: 'auth_oauth_flow_total',
        help: 'OAuth flow initiations and completions',
        labelNames: ['provider', 'event'] as const, // provider: 'google' | 'github', event: 'initiated' | 'completed' | 'failed'
        registers: [register],
    });

    const oauthProviderDuration = new promClient.Histogram({
        name: 'auth_oauth_provider_duration_seconds',
        help: 'Round-trip time to OAuth provider callback',
        labelNames: ['provider'] as const,
        buckets: [0.1, 0.5, 1, 2, 5],
        registers: [register],
    });

    // Security signals
    const authFailureTotal = new promClient.Counter({
        name: 'auth_failure_total',
        help: 'Authentication failures by reason',
        labelNames: ['reason'] as const, // 'invalid_credentials' | 'account_locked' | 'expired_token' | 'revoked_token'
        registers: [register],
    });

    return { register,
        httpRequestDurationSeconds,
        httpRequestsTotal,
        httpRequestsInFlight,
        tokenIssuedTotal,
        tokenRevocationTotal,
        activeRefreshTokens,
        oauthFlowTotal,
        oauthProviderDuration,
        authFailureTotal
    }
}


export const { register,
        httpRequestDurationSeconds,
        httpRequestsTotal,
        httpRequestsInFlight,
        tokenIssuedTotal,
        tokenRevocationTotal,
        activeRefreshTokens,
        oauthFlowTotal,
        oauthProviderDuration,
        authFailureTotal
    } = registerService('api-gateway');

type RouteEvent = {
    successEvent?: (req: Request, res: Response) => void;
    failureEvent?: (req: Request, res: Response) => void;
    failureReason?: string,
}

const ROUTE_EVENT_MAP: Record<string, RouteEvent> = {
        'POST /api/v1/auth/login': {
        successEvent: () => tokenIssuedTotal.inc({ token_type: 'access' }),
        failureReason: 'invalid_credentials',
    },
    'POST /api/v1/auth/refresh': {
        successEvent: () => tokenIssuedTotal.inc({ token_type: 'refresh' }),
        failureReason: 'expired_token',
    },
    'POST /api/v1/auth/logout': {
        successEvent: () => tokenRevocationTotal.inc({ reason: 'logout' }),
    },
};

//start timing metrics and populating the fields we want in the middleware
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/v1/monitoring')
        return next();

    const end = httpRequestDurationSeconds.startTimer();
    httpRequestsInFlight.inc({method: req.method});

    res.on('finish', () => {
        const route = req.route?.path ?? req.path; //allows use of route path for better cardinality when :userId baked in route
        const routeKey = `${req.method} ${req.route?.path ?? req.path}`;
        const statusCode = res.statusCode;
        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
        };

        httpRequestsTotal.inc(labels);
        end(labels);
        httpRequestsInFlight.dec({ method: req.method });

        //ROUTE_MAP_EVENT keeps the actions for each route
        const mapping = ROUTE_EVENT_MAP[routeKey];

        if (!mapping) return;

        if (statusCode >= 200 && statusCode < 300 && mapping.successEvent) {
            mapping.successEvent(req, res);
        }

        if ((statusCode == 401 || statusCode == 403) && mapping.failureReason) {
            authFailureTotal.inc({ reason: mapping.failureReason });
        }
    });

    next();
}

export async function monitor(req: Request, res: Response) {
    console.log("in monitoring");
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
}