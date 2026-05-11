import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import ProtectedLayout from "./ProtectedLayout";
import MyProfile from "./Profile";
import AdminUsers from "./AdminUser";

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/profile" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<ProtectedLayout />}>
                    <Route path="/profile" element={<MyProfile />} />
					<Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/interview" />
                    <Route path="/candidate" />
                    <Route path="/recruiter" />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}