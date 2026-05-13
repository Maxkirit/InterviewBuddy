import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import ProtectedLayout from "./ProtectedLayout";
import MyProfile from "./Profile";
import CandidateOfficialInterview from "./CandidateOfficialInterview";
import CandidateView from "./CandidateView";
import RecruiterView from "./RecruiterView";
import AdminView from "./AdminView";
import RecruiterInterviews from "./RecruiterInterview";
import AppLayout from "./AppLayout";
import AdminUsers from "./AdminUser";
import CandidateListRecruiters from "./CandidateListConnections"
import RecruiterListCandidates from "./RecruiterListConnections"
import GradingPage from "./GradingPage";


export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/profile" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<ProtectedLayout />}>
                    <Route element={<AppLayout />}>
                        <Route path="/candidate" element={<CandidateView />}>
                            <Route
                                path="/candidate/official-interviews"
                                element={<CandidateOfficialInterview />}/>
    						<Route
                            	path="/candidate/recruiters"
                            	element={<CandidateListRecruiters />}/>
                    </Route>
                        <Route path="/recruiter" element={<RecruiterView />}>
                            <Route 
								path="/recruiter/interviews" 
								element={<RecruiterInterviews />}/>
							<Route
                            	path="/recruiter/candidates"
                            	element={<RecruiterListCandidates />}/>
                            <Route
                                path="/recruiter/grading/:interview_id"
                                element={<GradingPage />}/>
                        </Route>
                        <Route path="/admin" element={<AdminView />}>
                            <Route path="/admin/users" element={<AdminUsers />} />
                        </Route>
                        <Route path="/profile" element={<MyProfile />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
