import { AuthContext } from "./AuthProvider";
import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function PublicRoutes() {
    const authContext = useContext(AuthContext);

    if (authContext?.isLoading === true) {
            return (
                <div>
                    <p>Loading...</p>
                </div>
            );
        }
    
    if (authContext?.accessToken !== null) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}