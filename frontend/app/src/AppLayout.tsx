import { useContext} from "react";
import { AuthContext } from "./AuthProvider";
import { Navigate, Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import Footer from "./Footer";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
        ? "no-underline text-sm font-medium px-3.5 py-1.5 rounded-lg bg-[#eef1ff] text-[#4f6ef7]"
        : "no-underline text-sm font-medium text-gray-500 px-3.5 py-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#4f6ef7] transition";

export default function AppLayout() {
    const authContext = useContext(AuthContext);
    const navigate = useNavigate();

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

    async function handleLogout() {
        try {
            await authContext?.axiosInstance.get('/api/v1/auth/logout');
            authContext?.logout();
            navigate("/login", {replace: true}); // likely redundant
        } catch (error) {
            console.log(`in error path: ${error}`);
        }
    }

    function renderNavbar() {
        if (authContext?.role === "candidate") {
            return (
                <nav className="bg-white border-b border-[#e4e8f0] px-8 h-[60px] flex items-center justify-between">
                    <div className="text-xl font-bold text-[#4f6ef7] tracking-[-0.3px]">
                        Interview<span className="text-[#1a1d2e]">Buddy</span>
                        <span className="text-xl font-normal text-gray-400 tracking-[-0.3px]">
                            {" "}
                            Candidate
                        </span>
                    </div>
                    <ul className="flex gap-1 list-none">
                        {/* <li>
                            <NavLink to="/candidate/mock-interviews" className={navLinkClass}>
                                Mock Interviews
                            </NavLink>
                        </li> */}
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
                        <Link to="/profile" className="avatar no-underline relative overflow-hidden">
                            {authContext?.profilePicUrl && (
                                <img
                                    src={`/avatars/${authContext?.profilePicUrl}`}
                                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                                    onError={(e) => e.currentTarget.remove()}
                                />
                            )}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium text-gray-500 px-3.5 py-1.5 rounded-lg hover:bg-[#fff0f0] hover:text-[#ef4444] transition cursor-pointer"
                        >
                            Logout
                        </button>
                    </div>
                </nav>
            );
        } else if (authContext?.role === "recruiter") {
            return (
                <nav className="bg-white border-b border-[#e4e8f0] px-8 h-[60px] flex items-center justify-between">
                    <div className="text-xl font-bold text-[#4f6ef7] tracking-[-0.3px]">
                        Interview<span className="text-[#1a1d2e]">Buddy</span>
                        <span className="text-xl font-normal text-gray-400 tracking-[-0.3px]">
                            {" "}
                            Recruiter
                        </span>
                    </div>
                    <ul className="flex gap-1 list-none">
                        <li>
                            <NavLink
                                to="/recruiter/interviews"
                                className={navLinkClass}
                            >
                                Official Interviews
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/recruiter/candidates"
                                className={navLinkClass}
                            >
                                Candidate List
                            </NavLink>
                        </li>
                    </ul>
                    <div className="flex items-center gap-3">
                        <Link to="/profile" className="avatar no-underline relative overflow-hidden">
                            {authContext?.profilePicUrl && (
                                <img
                                    src={`/avatars/${authContext?.profilePicUrl}`}
                                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                                    onError={(e) => e.currentTarget.remove()}
                                />
                            )}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium text-gray-500 px-3.5 py-1.5 rounded-lg hover:bg-[#fff0f0] hover:text-[#ef4444] transition cursor-pointer"
                        >
                            Logout
                        </button>
                    </div>
                </nav>
            );
        } else if (authContext?.role === "admin") {
            return (
                <nav className="bg-white border-b border-[#e4e8f0] px-8 h-[60px] flex items-center justify-between">
                    <div className="text-xl font-bold text-[#4f6ef7] tracking-[-0.3px]">
                        Interview<span className="text-[#1a1d2e]">Buddy</span>
                        <span className="text-xl font-normal text-gray-400 tracking-[-0.3px]">
                            {" "}
                            Admin
                        </span>
                    </div>
                    <ul className="flex gap-1 list-none">
                        <li>
                            <NavLink
                                to="/admin/users"
                                className={navLinkClass}
                            >
                                Users
                            </NavLink>
                        </li>
						<li>
                            <NavLink
                                to="/admin/connections"
                                className={navLinkClass}
                            >
                                Connections
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/interviews"
                                className={navLinkClass}
                            >
                                Interviews
                            </NavLink>
                        </li>
                    </ul>
                    <div className="flex items-center gap-3">
                        <Link to="/profile" className="avatar no-underline relative overflow-hidden">
                            {authContext?.profilePicUrl && (
                                <img
                                    src={`/avatars/${authContext?.profilePicUrl}`}
                                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                                    onError={(e) => e.currentTarget.remove()}
                                />
                            )}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium text-gray-500 px-3.5 py-1.5 rounded-lg hover:bg-[#fff0f0] hover:text-[#ef4444] transition cursor-pointer"
                        >
                            Logout
                        </button>
                    </div>
                </nav>
            );
        } else {
            authContext?.logout();
            return (
                <Navigate to="/login" replace />
            );
        }
    }

    return (
        <>
            {renderNavbar()}
            <Outlet />
            <Footer />
        </>
    );
}
