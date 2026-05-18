import { useState, useContext, useEffect, type SubmitEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "./AuthProvider";
import z from "zod";
import axios from "axios";
import ErrorBanner from "./ErrorBanner";

type Question = {
    question_id: number,
    name: string,
    context: string,
    functional_req: string,
    non_functional_req: string,
};

type Interview = {
    unique_interview_id: number,
    recruiter_id: number,
    candidate_id: number,
    question_id: number,
    questions: Question,
    job_title: string,
    status: string,
    due_date: string,
};

const AnswerSchema = z.object({
    reasoning: z.string().min(1),
});

export default function Interview() {
    const authContext = useContext(AuthContext);
    const { interview_id } = useParams();
    const [interview, setInterview] = useState<Interview>()
    const [reasoning, setReasoning] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function getInterview() {
            try {
                const res = await authContext?.axiosInstance.get(`/api/v1/interview/${interview_id}/start`);
                setInterview(res?.data);
            } catch (error) {
                console.log(`in error path: ${error}`);
                if (axios.isAxiosError(error) && error.response?.status == 410) {
                    navigate("/candidate/official-interviews", { replace: true, state: { flash: "This interview has been canceled by the recruiter." } });
                } else if (axios.isAxiosError(error) && error.response?.status == 403) {
                    navigate("/candidate/official-interviews", { replace: true, state: { flash: "Acess forbiden" } });
                }
				else
					navigate("/candidate/official-interviews", { replace: true, state: { flash: "Failed to load interview, please retry later" } });
            }
        }

        getInterview();
    }, []);

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        try {
            const parsed = AnswerSchema.parse({reasoning});
            await authContext?.axiosInstance.patch(`/api/v1/interview/${interview_id}/submit`, {
                reasoning: parsed.reasoning,
            });
            navigate('/candidate/official-interviews', {replace: true});
        } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status == 410) {
                    navigate("/candidate/official-interviews", { replace: true, state: { flash: "This interview has been canceled by the recruiter." } });
                } else if (axios.isAxiosError(error) && error.response?.status == 403) {
                    navigate("/candidate/official-interviews", { replace: true, state: { flash: "Acess forbiden" } });
                }
				else
					navigate("/candidate/official-interviews", { replace: true, state: { flash: "Failed to load interview, please retry later" } });
        }
    }

    return (
        <>
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
            <div className="max-w-[900px] mx-auto px-6 pt-8 pb-[60px] flex flex-col gap-5">
                {/* Question */}
                <div className="bg-white border border-[#e4e8f0] rounded-[14px] px-7 py-6">
                    <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-gray-400 mb-2.5">Question</h2>
                    <div className="text-[1.3rem] font-bold text-[#1a1d2e] mb-2">{interview?.questions.name}</div>
                    <p className="text-[0.9rem] text-[#4b5563] leading-relaxed">{interview?.questions.context}</p>
                </div>

                {/* Requirements */}
                <div className="bg-white border border-[#e4e8f0] rounded-[14px] px-7 py-6">
                    <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-gray-400 mb-2.5">Requirements</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-[0.825rem] font-bold text-[#374151] mb-2.5">Functional</h3>
                            <ul className="flex flex-col gap-[7px] list-none">
                                {interview?.questions.functional_req.split('\n\n').map((req, i) => (
                                    <li key={i} className="flex items-baseline gap-2 text-[0.875rem] text-[#4b5563]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#4f6ef7] shrink-0 mt-[3px]" />
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-[0.825rem] font-bold text-[#374151] mb-2.5">Non-functional</h3>
                            <ul className="flex flex-col gap-[7px] list-none">
                                {interview?.questions.non_functional_req.split('\n\n').map((req, i) => (
                                    <li key={i} className="flex items-baseline gap-2 text-[0.875rem] text-[#4b5563]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#4f6ef7] shrink-0 mt-[3px]" />
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Reasoning */}
                <form onSubmit={handleSubmit}>
                    <div className="bg-white border border-[#e4e8f0] rounded-[14px] px-7 py-6">
                        <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-gray-400 mb-2.5">Reasoning</h2>
                        <textarea
                            className="form-input min-h-[160px] resize-y"
                            placeholder="Explain the key decisions in your design — component choices, tradeoffs, bottlenecks, and how you'd scale further…"
                            value={reasoning}
                            onChange={(e) => setReasoning(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col items-end mt-4 gap-2">
                        <button className="btn-primary px-7 py-[10px] disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={!reasoning.trim()}>Submit</button>
                        {submitError && <p className="text-xs text-[#ef4444]">{submitError}</p>}
                    </div>
                </form>
            </div>
        </>
        
    );
}