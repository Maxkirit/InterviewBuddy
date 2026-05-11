import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import { Navigate, Outlet, Link, NavLink } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
        ? "no-underline text-sm font-medium px-3.5 py-1.5 rounded-lg bg-[#eef1ff] text-[#4f6ef7]"
        : "no-underline text-sm font-medium text-gray-500 px-3.5 py-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#4f6ef7] transition";

export default function CandidateView() {
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

    if (authContext?.role !== "candidate") {
        return <Navigate to="/profile" replace />;
    }

    return (
        <>
            <nav className="bg-white border-b border-[#e4e8f0] px-8 h-[60px] flex items-center justify-between">
                <div className="text-xl font-bold text-[#4f6ef7] tracking-[-0.3px]">
                    Interview<span className="text-[#1a1d2e]">Buddy</span>
                    <span className="text-xl font-normal text-gray-400 tracking-[-0.3px]">
                        {" "}
                        Candidate
                    </span>
                </div>
                <ul className="flex gap-1 list-none">
                    <li>
                        <NavLink to="/candidate/mock-interviews" className={navLinkClass}>
                            Mock Interviews
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/candidate/official-interviews" className={navLinkClass}>
                            Official Interviews
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/candidate/recruiters" className={navLinkClass}>
                            Recruiter List
                        </NavLink>
                    </li>
                </ul>
                <div className="flex items-center gap-3">
                    <Link
                        to="/profile"
                        className="avatar no-underline"
                        title="Tom Nguyen"
                    >
                        TN
                    </Link>
                </div>
            </nav>
            <Outlet />
        </>
    );
}
