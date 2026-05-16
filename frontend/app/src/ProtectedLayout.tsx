import { useContext, useEffect } from "react";
import { AuthContext } from "./AuthProvider";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedLayout() {
    const authContext = useContext(AuthContext);
	const location = useLocation();

    useEffect(() => {
        async function heartbeat() {
            if (document.visibilityState === 'hidden') return;
            try {
                await authContext?.axiosInstance.patch(`/api/v1/user/heartbeat`);
            } catch (_) {}
        }

        heartbeat();
        const id = setInterval(heartbeat, 30_000);
        return () => clearInterval(id);
    }, []);

    if (authContext?.isLoading === true) {
        return (
            <div>
                <p>Loading...</p>
            </div>
        );
    }

    if (authContext?.accessToken === null) {
        return <Navigate to="/login" state={{from: location}} replace />;
    }

    return <Outlet />;
}
