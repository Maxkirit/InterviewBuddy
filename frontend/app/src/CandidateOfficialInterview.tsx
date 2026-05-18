import { useEffect, useRef, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthProvider";
import { type Grade } from "./RecruiterInterview";
import ErrorBanner from "./ErrorBanner";

export type InterviewData = {
    unique_interview_id: number,
    recruiter_id: number,
    candidate_id: number,
    question_id: number,
    job_title: string,
    status: string,
    due_date: string,
}

type Interview = {
    id: number;
    recruiterId: number;
    candidateId: number;
    jobTitle: string;
    status: string;
    dueDate: Date;
};

type RecruiterData = {
    firstname: string,
    lastname: string,
    profile_pic_url: string,
    gender: string,
    date_of_birth: string,
    country: string,
    job_title: string,
    organization: string,
    bio: string,
    linkedin_link: string,
};

type DisplayStatus = "pending" | "overdue" | "completed" | "graded";

function getDisplayStatus(interview: Interview): DisplayStatus {
    if (interview.status === "graded")    return "graded";
    if (interview.status === "completed") return "completed";
    if (interview.dueDate < new Date())   return "overdue";
    return "pending";
}

function miniBarColor(score: number): string {
    if (score >= 4) return "#4f6ef7";
    if (score >= 3) return "#22c55e";
    if (score >= 2) return "#f59e0b";
    return "#ef4444";
}

export default function CandidateOfficialInterview() {
    const authContext = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [recruiterMap, setRecruiterMap] = useState<Record<string, RecruiterData>>({});
    const [gradeMap, setGradeMap] = useState<Record<number, Grade>>({});
    const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
    const [gradeErrorSet, setGradeErrorSet] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(location.state?.flash ?? null);
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        async function getInterviews() {
            try {
                const result = await authContext?.axiosInstance.get(
                    `/api/v1/interview/candidat-interviews/${authContext.userId}`,
                );
                console.log(result?.data);
                const parsed = (result?.data).map((item: InterviewData) => ({
                    id: item.unique_interview_id,
                    recruiterId: item.recruiter_id,
                    candidateId: item.candidate_id,
                    jobTitle: item.job_title,
                    status: item.status,
                    dueDate: new Date(item.due_date),
                }));
                setInterviews(parsed);
            } catch (error) {
                console.log("in error path");
                setError("Failed to load interviews. Please try again.");
            }
        }
        getInterviews();
    }, []);

    useEffect(() => {
        const uniqueRecruiterIds = [...new Set(interviews.map(i => i.recruiterId))];
        uniqueRecruiterIds.forEach(async (recruiterId) => {
            if (recruiterMap[recruiterId] || !recruiterId) return;
            try {
                const res = await authContext?.axiosInstance.get(`/api/v1/user/${recruiterId}/public`);
                setRecruiterMap((prev) => ({ ...prev, [recruiterId]: res?.data }));
            } catch (error) {
                console.log(`in error path: ${error}`);
                // handle error
            }
        });
    }, [interviews]);

    useEffect(() => {
        const gradedInterviews = [...new Set(interviews.filter((i) => i.status === "graded").map((i) => i.id))];
        gradedInterviews.forEach(async (interviewId) => {
            if (gradeMap[interviewId] || gradeErrorSet.has(interviewId) || !interviewId) return;
            try {
                const res = await authContext?.axiosInstance.get(`/api/v1/grading/grading-report`, {
                    params: {
                        interview_id: interviewId,
                    }
                });
                const splitted = res?.data.report.split('\n\n');
                const grade: Grade = {
                    req: parseInt(splitted[0]),
                    archi: parseInt(splitted[1]),
                    scale: parseInt(splitted[2]),
                    res: parseInt(splitted[3]),
                    note: splitted[4],
                };
                setGradeMap((prev) => ({ ...prev, [interviewId]: grade }));
            } catch (error) {
                setGradeErrorSet((prev) => new Set(prev).add(interviewId));
            }
        });
    }, [interviews]);

    useEffect(() => {
        if (selectedInterview) ref.current?.showModal();
        else ref.current?.close();
    }, [selectedInterview]);

    function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
        if (e.target === ref.current) setSelectedInterview(null);
    }

    function renderRightSide(displayStatus: DisplayStatus, interview: Interview) {
        switch (displayStatus) {
            case "pending":
                return (
                    <div className="flex-1 flex items-center gap-5 justify-end">
                        <span className="text-[0.75rem] text-gray-400 whitespace-nowrap">
                            Due {interview.dueDate.toDateString()}
                        </span>
                        <span className="status-badge status-pending">Pending</span>
                        <button
                            className="border-0 bg-[#4f6ef7] text-white font-semibold cursor-pointer transition hover:bg-[#3d5ce6] px-[18px] py-[7px] rounded-lg text-sm"
                            onClick={() => setSelectedInterview(interview)}
                        >
                            Start
                        </button>
                    </div>
                );

            case "overdue":
                return (
                    <div className="flex-1 flex items-center gap-5 justify-end">
                        <span className="text-[0.75rem] text-[#ef4444] font-semibold whitespace-nowrap">
                            Due {interview.dueDate.toDateString()}
                        </span>
                        <span className="status-badge status-overdue">Past due date</span>
                        <button
                            className="border-0 bg-[#e4e8f0] text-gray-400 cursor-not-allowed px-[18px] py-[7px] rounded-lg text-sm font-semibold"
                            disabled
                        >
                            Start
                        </button>
                    </div>
                );

            case "completed":
                return (
                    <div className="flex-1 flex items-center gap-5 justify-end">
                        <span className="text-[0.75rem] text-gray-400 whitespace-nowrap">Awaiting review</span>
                        <span className="status-badge status-completed">Completed</span>
                    </div>
                );

            case "graded": {
                const grade = gradeMap[interview.id];
                const total = grade ? grade.req + grade.archi + grade.scale + grade.res : null;
                const pct = total !== null ? Math.round((total / 20) * 100) : null;
                return (
                    <div className="flex-1 flex flex-col items-end gap-3">
                        <span className="status-badge status-graded">Graded</span>
                        {!grade && gradeErrorSet.has(interview.id) && (
                            <span className="text-xs text-[#ef4444]">Failed to load score</span>
                        )}
                        {grade && (
                            <div className="flex items-center gap-[18px]">
                                <div className="text-[1.15rem] font-bold text-[#4f6ef7] min-w-[44px] text-center">
                                    {pct}%
                                </div>
                                <div className="flex flex-col gap-[5px] w-[180px]">
                                    {([
                                        ["Requirements", grade.req],
                                        ["Architecture", grade.archi],
                                        ["Scalability",  grade.scale],
                                        ["Reasoning",    grade.res],
                                    ] as [string, number][]).map(([label, score]) => (
                                        <div key={label} className="flex items-center gap-1.5 text-[0.7rem] text-gray-500">
                                            <span className="w-[80px] shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
                                            <div className="flex-1 h-1 bg-[#f0f3ff] rounded-sm">
                                                <div
                                                    className="h-full rounded-sm"
                                                    style={{ width: `${(score / 5) * 100}%`, background: miniBarColor(score) }}
                                                />
                                            </div>
                                            <span className="w-6 text-right shrink-0">{score}/5</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
        }
    }

    function renderInterviews(interview: Interview) {
        const displayStatus = getDisplayStatus(interview);
        const recruiter = recruiterMap[interview.recruiterId];
        const name = recruiter ? `${recruiter.firstname} ${recruiter.lastname}` : "-";

        return (
            <div key={interview.id} className="bg-white border border-[#e4e8f0] rounded-[14px] px-6 py-5 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3.5 flex-[1_1_200px] min-w-0">
                    <div className="avatar relative overflow-hidden">
                        {recruiter?.profile_pic_url && (
                            <img
                                src={`/avatars/${recruiter.profile_pic_url}`}
                                className="absolute inset-0 w-full h-full object-cover rounded-full"
                                onError={(e) => e.currentTarget.remove()}
                            />
                        )}
                        {recruiter ? `${recruiter.firstname[0]}${recruiter.lastname[0]}` : "??"}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="text-[0.95rem] font-semibold text-[#1a1d2e]">{name}</div>
                        <div className="text-[0.8rem] text-gray-500">
                            {recruiter?.organization ?? "-"} · {interview.jobTitle}
                        </div>
                    </div>
                </div>
                {renderRightSide(displayStatus, interview)}
            </div>
        );
    }

    return (
        <>
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
            <div className="max-w-[900px] mx-auto py-10 px-6">
                <div className="flex items-baseline gap-3 mb-7">
                    <h1 className="text-[1.75rem] font-bold text-[#1a1d2e]">Interviews</h1>
                </div>
                <div className="flex flex-col gap-3">
                    {interviews.length === 0 ? (
                        <p>No interviews yet</p>
                    ) : interviews.filter((item) => item.status !== "mock").map(renderInterviews)}
                </div>
            </div>

            <dialog ref={ref} id="start-modal" onClick={handleBackdropClick}>
                <div className="p-8 px-9" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">Start interview?</h2>
                        <button
                            className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-gray-400 text-xs cursor-pointer flex items-center justify-center transition hover:border-[#ef4444] hover:text-[#ef4444]"
                            onClick={() => setSelectedInterview(null)}
                        >
                            &#10005;
                        </button>
                    </div>
                    <div className="flex flex-col gap-4">
                        <p>You are about to start an official interview.</p>
                        <p className="mt-2.5 px-3.5 py-2.5 bg-[#fef3c7] border border-[#fcd34d] rounded-lg text-[0.825rem] text-[#92400e] leading-relaxed">
                            Once started, the interview cannot be paused or restarted. Make sure you are
                            in a quiet environment and have enough time to complete it before continuing.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2.5 mt-6">
                        <button className="btn-cancel" onClick={() => setSelectedInterview(null)}>
                            Go back
                        </button>
                        <button
                            className="btn-primary px-6 py-[9px]"
                            onClick={() => {
                                if (selectedInterview) navigate(`/candidate/interview/${selectedInterview.id}`);
                            }}
                        >
                            Start interview
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    );
}
