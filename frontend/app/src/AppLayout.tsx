import { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthProvider";
import { Navigate, Outlet, Link, NavLink } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
        ? "no-underline text-sm font-medium px-3.5 py-1.5 rounded-lg bg-[#eef1ff] text-[#4f6ef7]"
        : "no-underline text-sm font-medium text-gray-500 px-3.5 py-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#4f6ef7] transition";

export default function AppLayout() {
    const authContext = useContext(AuthContext);
    const [url, setUrl] = useState();

    useEffect(() => {
        if (!authContext?.accessToken) return;
        async function getUrl() {
            try {
                const res = await authContext?.axiosInstance.get(`/api/v1/user/avatar/${authContext.userId}`);
                setUrl(res?.data.profile_pic_url);
            } catch (error) {
                console.log("in error path");
            }
        }
        getUrl();
    }, [authContext?.accessToken]);

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
                            {url && (
                                <img
                                    src={`http://localhost:3000/avatars/${url}`}
                                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                                    onError={(e) => e.currentTarget.remove()}
                                />
                            )}
                        </Link>
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
                            {url && (
                                <img
                                    src={`http://localhost:3000/avatars/${url}`}
                                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                                    onError={(e) => e.currentTarget.remove()}
                                />
                            )}
                        </Link>
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
                                to="/admin/Interviews"
                                className={navLinkClass}
                            >
                                Interviews
                            </NavLink>
                        </li>
                    </ul>
                    <div className="flex items-center gap-3">
                        <Link to="/profile" className="avatar no-underline relative overflow-hidden">
                            {url && (
                                <img
                                    src={`http://localhost:3000/avatars/${url}`}
                                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                                    onError={(e) => e.currentTarget.remove()}
                                />
                            )}
                        </Link>
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
            <footer className="flex justify-center gap-5 px-6 py-6 text-[0.8rem]">
                <Link to="" className="text-[#b0b7c3] no-underline hover:text-gray-500 transition">Privacy Policy</Link>
                <Link to="" className="text-[#b0b7c3] no-underline hover:text-gray-500 transition">Terms of Service</Link>
            </footer>
        </>
    );
}
