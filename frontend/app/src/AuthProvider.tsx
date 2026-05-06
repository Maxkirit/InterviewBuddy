import axios from "axios";
import { createContext, useEffect, useState, type ReactNode } from "react";

type AuthContextType = {
    accessToken: string | null,
    login: (token: string) => void;
    logout: () => void;
    isLoading: boolean,
};

export const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // hit /refresh to get new access token (with refresh token in cookie)
        // if success setToken and pass it in context
        // if not fail (no or expired refresh token) redirect to login
        const controller = new AbortController();
        axios.defaults.withCredentials = true
        async function restoreSession() {
            try {
                const result = await axios.post(
                    "http://localhost:3000/api/v1/auth/refresh",
                    null,
                    { withCredentials: true, signal: controller.signal }
                );
                setToken(result.data.accessToken);
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

    function login(token: string) {
        setToken(token);
    }

    function logout() {
        setToken(null);
    }

    return (
        <AuthContext.Provider value={{ accessToken: token, login: login, logout: logout, isLoading: isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}