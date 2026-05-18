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
    reject: (error: unknown) => void;
};

type AuthContextType = {
    userId: number | null;
    role: string | null;
    accessToken: string | null;
    login: (token: string, userId: number, role: string) => void;
    logout: () => void;
    isLoading: boolean;
    axiosInstance: AxiosInstance;
    profilePicUrl: string | null;
    setProfilePicUrl: (url: string | null) => void;
};

type JwtPayload = {
    userId: string;
    permissions: string[];
    role: string;
};

//for dev container
axios.defaults.baseURL="http://localhost:3000";

export const AuthContext = createContext<AuthContextType | null>(null);

export function decodeJwt(token: string): JwtPayload {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
}

// axios.defaults.baseURL = "http://localhost:3000";

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
    const axiosInstance = useRef(axios.create({ withCredentials: true })).current;
    const tokenRef = useRef<string | null>(null);
    const isRefreshingRef = useRef(false);
    const failedQueueRef = useRef<QueueItem[]>([]);

    tokenRef.current = token;

    function login(newToken: string, newUserId: number, newRole: string) {
        setToken(newToken);
        setUserId(newUserId);
        setRole(newRole);
    }

    function logout() {
        setToken(null);
        setUserId(null);
        setProfilePicUrl(null);
    }

    // Register interceptors once on mount; eject on unmount
    useEffect(() => {
        function processQueue(error: unknown | null, token: string | null = null) {
            failedQueueRef.current.forEach((item) => {
                if (error) item.reject(error);
                else item.resolve(token!);
            });
            failedQueueRef.current = [];
        }

        const reqId = axiosInstance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                if (tokenRef.current) {
                    config.headers.set("Authorization", `Bearer ${tokenRef.current}`);
                }
                return config;
            },
            (error) => Promise.reject(error),
        );

        const resId = axiosInstance.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as RetryConfig | undefined;

                if (
                    error.response?.status === 401 &&
                    originalRequest &&
                    !originalRequest._retry
                ) {
                    if (isRefreshingRef.current) {
                        return new Promise<string>((resolve, reject) => {
                            failedQueueRef.current.push({ resolve, reject });
                        })
                            .then((token) => {
                                originalRequest.headers["Authorization"] = `Bearer ${token}`;
                                return axiosInstance(originalRequest);
                            })
                            .catch((err) => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    isRefreshingRef.current = true;

                    try {
                        const { data } = await axios.post(
                            "/api/v1/auth/refresh",
                            null,
                            { withCredentials: true },
                        );
                        const newToken = data.accessToken;
                        tokenRef.current = newToken;
                        setToken(newToken);
                        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
                        processQueue(null, newToken);
                        return axiosInstance(originalRequest);
                    } catch (refreshError) {
                        processQueue(refreshError, null);
                        logout();
                        return Promise.reject(refreshError);
                    } finally {
                        isRefreshingRef.current = false;
                    }
                }

                return Promise.reject(error);
            },
        );

        return () => {
            axiosInstance.interceptors.request.eject(reqId);
            axiosInstance.interceptors.response.eject(resId);
        };
    }, []);

    useEffect(() => {
        if (!userId) return;
        async function fetchAvatar() {
            try {
                const res = await axiosInstance.get(`/api/v1/user/avatar/${userId}`);
                setProfilePicUrl(res.data.profile_pic_url ?? null);
            } catch (_) {}
        }
        fetchAvatar();
    }, [userId]);

    useEffect(() => {
        const controller = new AbortController();
        axios.defaults.withCredentials = true;
        async function restoreSession() {
            try {
                const result = await axios.post(
                    "/api/v1/auth/refresh",
                    null,
                    { withCredentials: true, signal: controller.signal },
                );
                const decoded = decodeJwt(result.data.accessToken);
                setToken(result.data.accessToken);
                setUserId(parseInt(decoded.userId));
                setRole(decoded.role);
            } catch (error) {
                if (axios.isCancel(error)) return;
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        restoreSession();
        return () => controller.abort();
    }, []);

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
                profilePicUrl: profilePicUrl,
                setProfilePicUrl: setProfilePicUrl,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
