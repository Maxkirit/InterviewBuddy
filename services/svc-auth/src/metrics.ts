import promClient from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const  register = new promClient.Registry();
register.setDefaultLabels({
    app: 'svc-auth',
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

// Token operations
export const tokenIssuedTotal = new promClient.Counter({
    name: 'auth_tokens_issued_total',
    help: 'Tokens issued by type',
    labelNames: ['token_type'], // 'access' | 'refresh'
});

export const tokenVerificationTotal = new promClient.Counter({
    name: 'auth_token_verification_total',
    help: 'Token verification attempts',
    labelNames: ['token_type', 'result'], // result: 'success' | 'expired' | 'revoked' | 'invalid'
});

export const tokenRevocationTotal = new promClient.Counter({
    name: 'auth_token_revocation_total',
    help: 'Token revocations by trigger',
    labelNames: ['reason'], // 'logout' | 'rotation' | 'admin' | 'multi_device_broadcast'
});

export const activeRefreshTokens = new promClient.Gauge({
    name: 'auth_active_refresh_tokens',
    help: 'Estimated active refresh token sessions (from Redis)',
});

// OAuth / 3rd party
export const oauthFlowTotal = new promClient.Counter({
    name: 'auth_oauth_flow_total',
    help: 'OAuth flow initiations and completions',
    labelNames: ['provider', 'event'], // provider: 'google' | 'github', event: 'initiated' | 'completed' | 'failed'
});

export const oauthProviderDuration = new promClient.Histogram({
    name: 'auth_oauth_provider_duration_seconds',
    help: 'Round-trip time to OAuth provider callback',
    labelNames: ['provider'],
    buckets: [0.1, 0.5, 1, 2, 5],
});

// Security signals
export const authFailureTotal = new promClient.Counter({
    name: 'auth_failure_total',
    help: 'Authentication failures by reason',
    labelNames: ['reason'], // 'invalid_credentials' | 'account_locked' | 'expired_token' | 'revoked_token'
});