import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import { Navigate, Outlet } from "react-router-dom";

export default function AdminView() {
    const authContext = useContext(AuthContext);

    if (authContext?.isLoading === true) {
        return (
            <div>
                <p>Loading...</p>
            </div>
        );
    }

    if (authContext?.accessToken === null) {
        return <Navigate to="/login" replace />;
    }

    if (authContext?.role !== "admin") {
        return <Navigate to="/profile" replace />;
    }

    return <Outlet />;
}
