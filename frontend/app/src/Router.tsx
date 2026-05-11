import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import ProtectedLayout from "./ProtectedLayout";
import MyProfile from "./Profile";
import CandidateOfficialInterview from "./CandidateOfficialInterview";
import CandidateView from "./CandidateView";
import RecruiterView from "./RecruiterView";
import AdminView from "./AdminView";

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/profile" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<ProtectedLayout />}>
                    <Route path="/candidate" element={<CandidateView />}>
                        <Route
                            path="/candidate/official-interviews"
                            element={<CandidateOfficialInterview />}
                        />
                    </Route>
                    <Route
                        path="/recruiter"
                        element={<RecruiterView />}
                    ></Route>
                    <Route path="/admin" element={<AdminView />}></Route>
                    <Route path="/profile" element={<MyProfile />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
