import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import AuthCallback from "./3rdPartyAuthCallback";
import PickRole from "./PickRole";
import ProtectedLayout from "./ProtectedLayout";
import MyProfile from "./Profile";
import CandidateOfficialInterview from "./CandidateOfficialInterview";
import CandidateView from "./CandidateView";
import RecruiterView from "./RecruiterView";
import AdminView from "./AdminView";
import RecruiterInterviews from "./RecruiterInterview";
import AppLayout from "./AppLayout";
import AdminUsers from "./AdminUser";
import Interview from "./Interview";
import CandidateListRecruiters from "./CandidateListConnections"
import RecruiterListCandidates from "./RecruiterListConnections"
import InviteLink from "./invite";
import GradingPage from "./GradingPage";
import ViewProfile from "./ViewProfile";
import LegalPage from "./Legal";


export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/profile" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/auth/callback" element={<AuthCallback />}/>
                <Route element={<ProtectedLayout />}>
                <Route path="/pick-role" element={<PickRole />}/>
                    <Route element={<AppLayout />}>
						<Route path="/invite" element={<InviteLink />} />
                        <Route path = "/legal" element={<LegalPage />} />
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
                        <Route path="/profile/:user_id" element={<ViewProfile />} />
                    </Route>
                    <Route path="/candidate/interview/:interview_id" element={<Interview />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
