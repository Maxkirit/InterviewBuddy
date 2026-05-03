import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import ProtectedLayout from "./ProtectedLayout";
import Profile from "./Profile";

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" />
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