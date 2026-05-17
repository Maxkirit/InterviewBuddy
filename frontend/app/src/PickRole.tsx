import { useContext, useState } from "react";
import { AuthContext, decodeJwt } from "./AuthProvider";
import { useNavigate } from "react-router-dom";

export default function PickRole() {
    const authContext = useContext(AuthContext);
    const navigate = useNavigate();

    // Track which role card the user has selected before confirming
    const [selectedRole, setSelectedRole] = useState<"candidate" | "recruiter">("candidate");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function updateRole() {
        setIsSubmitting(true);
        try {
            console.log("in updateRole");
            const response = await authContext?.axiosInstance.patch(
                `/api/v1/auth/${authContext?.userId}/role`,
                { newRole: selectedRole }
            );
            if (!response?.data.accessToken || !authContext?.userId)
                throw new Error("Missing fields in response");
            const decoded = decodeJwt(response.data.accessToken);
            authContext?.login(response.data.accessToken, authContext.userId, decoded.role);
            navigate("/profile", { replace: true });
        } catch (error) {
            setIsSubmitting(false);
            // display error banner
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="bg-white border border-[#e4e8f0] rounded-2xl py-10 px-11 w-full max-w-[420px]">

                {/* Brand header — same as Login/Register */}
                <span className="text-[1.4rem] font-bold text-[#4f6ef7] tracking-[-0.3px] mb-7 block cursor-default">
                    Interview<span className="text-[#1a1d2e]">Buddy</span>
                </span>

                <h1 className="text-[1.4rem] font-bold text-[#1a1d2e] mb-1.5">
                    One last step
                </h1>
                <p className="text-sm text-gray-500 mb-7">
                    Who are you joining as?
                </p>

                {/* Role cards — same pattern as Register */}
                <div className="flex gap-2.5 mb-6">
                    <label className="flex-1 border-2 border-[#e4e8f0] rounded-xl p-4 text-center cursor-pointer transition has-[:checked]:border-[#4f6ef7] has-[:checked]:bg-[#f0f3ff]">
                        <input
                            type="radio"
                            name="role"
                            value="candidate"
                            className="hidden"
                            checked={selectedRole === "candidate"}
                            onChange={() => setSelectedRole("candidate")}
                        />
                        <div className="text-2xl mb-1.5">&#128101;</div>
                        <span className="block text-sm font-semibold text-[#1a1d2e]">Candidate</span>
                        <span className="block text-xs text-gray-500 mt-0.5">I'm looking for a job</span>
                    </label>

                    <label className="flex-1 border-2 border-[#e4e8f0] rounded-xl p-4 text-center cursor-pointer transition has-[:checked]:border-[#4f6ef7] has-[:checked]:bg-[#f0f3ff]">
                        <input
                            type="radio"
                            name="role"
                            value="recruiter"
                            className="hidden"
                            checked={selectedRole === "recruiter"}
                            onChange={() => setSelectedRole("recruiter")}
                        />
                        <div className="text-2xl mb-1.5">&#128188;</div>
                        <span className="block text-sm font-semibold text-[#1a1d2e]">Recruiter</span>
                        <span className="block text-xs text-gray-500 mt-0.5">I'm hiring</span>
                    </label>
                </div>

                {/* Single confirm button — calls updateRole with current selectedRole state */}
                <button
                    className="btn-primary w-full py-[11px]"
                    onClick={updateRole}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Saving…" : "Continue"}
                </button>
            </div>
        </div>
    );
}



    