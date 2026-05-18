import { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthProvider";
import { useParams } from "react-router-dom";
import axios from "axios";
import ErrorBanner from "./ErrorBanner";

type UserData = {
    firstname: string;
    lastname: string;
    profile_pic_url: string;
    gender: string;
    date_of_birth: string;
    country: string;
    job_title: string;
    organization: string;
    bio: string;
    linkedin_link: string;
};

function Field({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[0.8rem] font-semibold text-[#6b7280] uppercase tracking-wide">{label}</span>
            <div className="form-input bg-[#f9fafb] text-[#1a1d2e] cursor-default select-text">
                {value || <span className="text-gray-400">—</span>}
            </div>
        </div>
    );
}

export default function ViewProfile() {
    const authContext = useContext(AuthContext);
    const { user_id } = useParams();
    const [user, setUser] = useState<UserData>();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function getUser() {
            try {
                const res = await authContext?.axiosInstance.get(`api/v1/user/${user_id}/public`);
                setUser(res?.data);
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status == 410) {
                    setError("This interview has been canceled by the recruiter.");
                } else 
                    setError("Failed to load user profile. Please try again.");
            }
        }
        getUser();
    }, [user_id]);

    return (
        <>
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
            <div className="max-w-[720px] mx-auto py-10 px-6">
                <div className="grid grid-cols-[220px_1fr] gap-10 items-start">
                    {/* Left column */}
                    <div className="flex flex-col items-center gap-5">
                        <div className="relative w-[100px] h-[100px]">
                            <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] flex items-center justify-center text-white text-[2rem] font-bold overflow-hidden">
                                {user?.profile_pic_url && (
                                    <img
                                        src={`/avatars/${user.profile_pic_url}`}
                                        className="absolute inset-0 w-full h-full object-cover rounded-full"
                                        onError={(e) => e.currentTarget.remove()}
                                    />
                                )}
                                {user ? `${user.firstname[0]}${user.lastname[0]}` : "??"}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-base font-bold text-[#1a1d2e]">
                                {user?.firstname} {user?.lastname}
                            </div>
                            <div className="text-[0.825rem] text-gray-500 mt-[3px]">{user?.job_title}</div>
                            <div className="text-[0.825rem] text-gray-500 mt-[3px]">{user?.country}</div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col gap-4">
                        <h1 className="text-[1.75rem] font-bold text-[#1a1d2e] mb-1">Profile</h1>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="First name" value={user?.firstname} />
                            <Field label="Last name" value={user?.lastname} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Country" value={user?.country} />
                            <Field label="Organisation" value={user?.organization} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Job title" value={user?.job_title} />
                            <Field label="Gender" value={user?.gender} />
                        </div>
                        <Field label="Bio" value={user?.bio} />
                        <div className="flex flex-col gap-1">
                            <span className="text-[0.8rem] font-semibold text-[#6b7280] uppercase tracking-wide">LinkedIn</span>
                            {user?.linkedin_link ? (
                                <a
                                    href={user.linkedin_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="form-input bg-[#f9fafb] text-[#4f6ef7] hover:underline cursor-pointer"
                                >
                                    {user.linkedin_link}
                                </a>
                            ) : (
                                <div className="form-input bg-[#f9fafb] text-gray-400 cursor-default">—</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
