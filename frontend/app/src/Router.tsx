import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import ProtectedLayout from "./ProtectedLayout";
import Profile from "./Profile";

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/profile" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<ProtectedLayout />}>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/interview" />
                    <Route path="/candidate" />
                    <Route path="/recruiter" />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}