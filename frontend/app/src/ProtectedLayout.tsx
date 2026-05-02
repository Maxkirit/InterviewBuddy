import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedLayout() {
    const authContext = useContext(AuthContext);

    if (authContext?.accessToken === null) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}