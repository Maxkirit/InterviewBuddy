import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import { Navigate, Outlet, Link } from "react-router-dom";

export default function CandidateView() {
    const authContext = useContext(AuthContext);

    if (authContext?.isLoading === true) {
        return (
            <div><p>Loading...</p></div>
        );
    }

    if (authContext?.accessToken === null) {
        return <Navigate to="/login" replace />;
    }

    if (authContext?.role !== "candidate") {
        return <Navigate to="/profile" replace />;
    }

    return (
        <>
            <nav>
                <div className="nav-logo">
                    Interview<span>Buddy</span
                    ><span className="nav-view-label">Candidate</span>
                </div>
                <ul className="nav-links">
                    <li>
                        <Link to="">Mock Interviews</Link>
                    </li>
                    <li>
                        <Link to="/candidate/official-interviews" className="active">Official Interviews</Link>
                    </li>
                    <li>
                        <Link to="">Recruiter List</Link>
                    </li>
                </ul>
                <div className="nav-right">
                    <Link to="/profile" className="avatar" title="Tom Nguyen">TN</Link>
                </div>
            </nav>
            <Outlet />
        </>
    );
}