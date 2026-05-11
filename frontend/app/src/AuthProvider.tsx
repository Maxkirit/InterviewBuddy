import axios, {
    type AxiosInstance,
    type AxiosError,
    type InternalAxiosRequestConfig,
} from "axios";
import { createContext, useEffect, useRef, useState, type ReactNode } from "react";

interface RetryConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

type QueueItem = {
    resolve: (token: string) => void;
    reject: (error: AxiosError) => void;
};

type AuthContextType = {
    userId: number;
    role: string;
    accessToken: string | null;
    login: (token: string, userId: number, role: string) => void;
    logout: () => void;
    isLoading: boolean;
    axiosInstance: AxiosInstance;
};

type JwtPayload = {
    userId: string;
    permissions: string[];
    role: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function decodeJwt(token: string): JwtPayload {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
}

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    function login(token: string, userId: number, role: string) {
        setToken(token);
        setUserId(userId);
        setRole(role);
    }

    function logout() {
        setToken(null);
        setUserId(null);
    }

    const axiosInstance = axios.create({
        baseURL: "http://localhost:3000",
        withCredentials: true,
    });

    axiosInstance.interceptors.request.use(
        function (config: InternalAxiosRequestConfig) {
            if (token) {
                config.headers.set("Authorization", `Bearer ${token}`);
            }
            return config;
        },
        function (error) {
            return Promise.reject(error);
        },
    );

    const isRefreshing = useRef(false);
    const failedQueue = useRef<QueueItem[]>([]);

    const processQueue = (error: AxiosError | null, token: string | null = null): void => {
        failedQueue.current.forEach((item) => {
            if (error) {
                item.reject(error);
            } else {
                item.resolve(token!);
            }
        });
        failedQueue.current = [];
    };

    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as RetryConfig | undefined;

            if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
                if (isRefreshing.current) {
                    // Queue the request until the refresh completes
                    return new Promise<string>((resolve, reject) => {
                        failedQueue.current.push({ resolve, reject });
                    })
                    .then((token) => {
                        originalRequest.headers["Authorization"] = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
                }

                originalRequest._retry = true;
                isRefreshing.current = true;

                try {
                    const { data } = await axios.post("/auth/refresh",
                        null,
                        { withCredentials: true,}
                    );
                    const newToken = data.accessToken;
                    setToken(newToken);
                    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

                    processQueue(null, newToken);
                    return axiosInstance(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    // Redirect to login or emit an event
                    setToken(null);
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing.current = false;
                }
            }

            return Promise.reject(error);
        }
    );

    useEffect(() => {
        // hit /refresh to get new access token (with refresh token in cookie)
        // if success setToken and pass it in context
        // if not fail (no or expired refresh token) redirect to login
        const controller = new AbortController();
        axios.defaults.withCredentials = true;
        async function restoreSession() {
            try {
                const result = await axios.post(
                    "http://localhost:3000/api/v1/auth/refresh",
                    null,
                    { withCredentials: true, signal: controller.signal },
                );
                const decoded = decodeJwt(result.data.accessToken);
                setToken(result.data.accessToken);
                setUserId(parseInt(decoded.userId));
                setRole(decoded.role);
            } catch (error) {
                if (axios.isCancel(error)) return;
                // genuinely not logged in
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        restoreSession();
        return () => controller.abort();
    }, []);

    // if (isLoading === true) {
    //     return (
    //         <div><p>Loading...</p></div>
    //     );
    // }

    return (
        <AuthContext.Provider
            value={{
                accessToken: token,
                userId: userId,
                role: role,
                login: login,
                logout: logout,
                isLoading: isLoading,
                axiosInstance: axiosInstance,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
