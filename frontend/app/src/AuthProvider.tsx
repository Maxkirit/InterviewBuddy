import axios from "axios";
import { createContext, useEffect, useState, type ReactNode } from "react";

type AuthContextType = {
    accessToken: string | null,
    login: (token: string) => void;
    logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // hit /refresh to get new access token (with refresh token in cookie)
        // if success setToken and pass it in context
        // if not fail (no or expired refresh token) redirect to login
        axios.defaults.withCredentials = true
        async function restoreSession() {
            try {
                const result = await axios.post("https://localhost/api/v1/refresh", null, { timeout: 2000 });
                setToken(result.data.access_token);
            } catch(error) {
                // not logged in
            } finally {
                setIsLoading(false);
            }
        }

        restoreSession();
    }, []);

    if (isLoading === true) {
        return (
            <div><p>Loading...</p></div>
        );
    }

    function login(token: string) {
        setToken(token);
    }

    function logout() {
        setToken(null);
    }

    return (
        <AuthContext.Provider value={{ accessToken: token, login: login, logout: logout }}>
            {children}
        </AuthContext.Provider>
    );
}