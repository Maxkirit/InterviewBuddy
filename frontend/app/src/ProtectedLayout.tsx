import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedLayout() {
    const authContext = useContext(AuthContext);
	const location = useLocation();
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
