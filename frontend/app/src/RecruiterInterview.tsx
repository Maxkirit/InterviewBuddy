import { useEffect, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";
import SetupInterviewModal from "./SetupInterviewModal";
import { type InterviewData } from "./CandidateOfficialInterview";
import ErrorBanner from "./ErrorBanner";

export type Grade = {
    req: number;
    archi: number;
    scale: number;
    res: number;
    note: string;
};

type Interview = {
    id: number;
    recruiterId: number;
    candidateId: number;
    jobTitle: string;
    status: string;
    dueDate: Date;
};

type CandidateData = {
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

type DisplayStatus = "pending" | "overdue" | "completed" | "graded";

function getDisplayStatus(interview: Interview): DisplayStatus {
    if (interview.status === "graded")                          return "graded";
    if (interview.status === "completed")                       return "completed";
    if (interview.status === "past_due_date")                   return "overdue";
    if (interview.dueDate < new Date())                         return "overdue";
    return "pending";
}

function miniBarColor(score: number): string {
    if (score >= 4) return "#4f6ef7";
    if (score >= 3) return "#22c55e";
    if (score >= 2) return "#f59e0b";
    return "#ef4444";
}

export default function RecruiterInterviews() {
    const authContext = useContext(AuthContext);
    const navigate = useNavigate();
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [candidateMap, setCandidateMap] = useState<Record<string, CandidateData>>({});
    const [gradeMap, setGradeMap] = useState<Record<number, Grade>>({});
    const [confirmInterviewId, setConfirmInterviewId] = useState<number | null>(null);
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [gradeErrorSet, setGradeErrorSet] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const confirmRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        async function getInterviews() {
            try {
                const result = await authContext?.axiosInstance.get(
                    `/api/v1/interview/real-interviews/${authContext.userId}`,
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
                setError("Failed to load interviews. Please try again.");
            }
        }
        getInterviews();
    }, [refreshKey]);

    useEffect(() => {
        const uniqueCandidateIds = [...new Set(interviews.map((i) => i.candidateId))];
        uniqueCandidateIds.forEach(async (candidateId) => {
            if (candidateMap[candidateId] || !candidateId) return;
            try {
                const res = await authContext?.axiosInstance.get(`api/v1/user/${candidateId}/public`);
                setCandidateMap((prev) => ({ ...prev, [candidateId]: res?.data }));
            } catch (error) {
                // handle error
                console.log(`in error path: ${error}`);
            }
        });
    }, [interviews]);

    useEffect(() => {
        const gradedInterviews = [...new Set(interviews.filter((i) => i.status === "graded").map((i) => i.id))];
        gradedInterviews.forEach(async (interviewId) => {
            if (gradeMap[interviewId] || gradeErrorSet.has(interviewId) || !interviewId) return;
            try {
                const res = await authContext?.axiosInstance.get(`api/v1/grading/grading-report`, {
                    params: {
                        interview_id: interviewId,
                    }
                });
                if (res?.data.report) {
                    const splitted = res?.data.report.split('\n\n');
                    const grade: Grade = {
                        req: parseInt(splitted[0]),
                        archi: parseInt(splitted[1]),
                        scale: parseInt(splitted[2]),
                        res: parseInt(splitted[3]),
                        note: splitted[4],
                    };
                    setGradeMap((prev) => ({ ...prev, [interviewId]: grade }));
                }
            } catch (error) {
                setGradeErrorSet((prev) => new Set(prev).add(interviewId));
            }
        });
    }, [interviews]);

    useEffect(() => {
        if (confirmInterviewId !== null) confirmRef.current?.showModal();
        else confirmRef.current?.close();
    }, [confirmInterviewId]);

    function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
        if (e.target === confirmRef.current) setConfirmInterviewId(null);
    }

    async function handleDeleteInterview() {
        if (confirmInterviewId === null) return;
        try {
            await authContext?.axiosInstance.patch(
                `/api/v1/interview/${confirmInterviewId}/delete`
            );
            setInterviews((prev) => prev.filter((i) => i.id !== confirmInterviewId));
        } catch (e) {
            console.log("error deleting interview");
        }
        setConfirmInterviewId(null);
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
                            className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
                            onClick={() => setConfirmInterviewId(interview.id)}
                        >
                            Delete
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
                            className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
                            onClick={() => setConfirmInterviewId(interview.id)}
                        >
                            Delete
                        </button>
                    </div>
                );

            case "completed":
                return (
                    <div className="flex-1 flex items-center gap-5 justify-end">
                        <span className="status-badge status-completed">Completed</span>
                        <button
                            className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#4f6ef7] text-[#4f6ef7] hover:bg-[#4f6ef7] hover:text-white"
                            onClick={() => navigate(`/recruiter/grading/${interview.id}`)}
                        >
                            Grade
                        </button>
                        <button
                            className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
                            onClick={() => setConfirmInterviewId(interview.id)}
                        >
                            Delete
                        </button>
                    </div>
                );

            case "graded": {
                const grade = gradeMap[interview.id];
                const total = grade ? grade.req + grade.archi + grade.scale + grade.res : null;
                const pct = total !== null ? Math.round((total / 20) * 100) : null;
                return (
                    <div className="flex-1 flex flex-col items-end gap-3">
                        <div className="flex items-center gap-5">
                            <span className="status-badge status-graded">Graded</span>
                            <button
                                className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
                                onClick={() => setConfirmInterviewId(interview.id)}
                            >
                                Delete
                            </button>
                        </div>
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
                                {/* <button
                                    className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#4f6ef7] text-[#4f6ef7] hover:bg-[#4f6ef7] hover:text-white"
                                    onClick={() => navigate(`/recruiter/report/${interview.id}`)}
                                >
                                    See report
                                </button> */}
                            </div>
                        )}
                    </div>
                );
            }
        }
    }

    function renderInterviews(interview: Interview) {
        const displayStatus = getDisplayStatus(interview);
        const candidate = candidateMap[interview.candidateId];
        const name = candidate ? `${candidate.firstname} ${candidate.lastname}` : "-";

        return (
            <div key={interview.id} className="bg-white border border-[#e4e8f0] rounded-[14px] px-6 py-5 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3.5 flex-[1_1_200px] min-w-0">
                    <div className="avatar relative overflow-hidden">
                        {candidate?.profile_pic_url && (
                            <img
                                src={`/avatars/${candidate.profile_pic_url}`}
                                className="absolute inset-0 w-full h-full object-cover rounded-full"
                                onError={(e) => e.currentTarget.remove()}
                            />
                        )}
                        {candidate ? `${candidate.firstname[0]}${candidate.lastname[0]}` : "??"}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="text-[0.95rem] font-semibold text-[#1a1d2e]">{name}</div>
                        <div className="text-[0.8rem] text-gray-500">{interview.jobTitle}</div>
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
                    <button
                        className="border-0 bg-[#4f6ef7] text-white font-semibold cursor-pointer transition hover:bg-[#3d5ce6] px-5 py-[9px] rounded-lg text-sm"
                        onClick={() => setIsSetupOpen(true)}
                    >
                        Schedule interview
                    </button>
                </div>
                <div className="flex flex-col gap-3">
                    {interviews.length === 0 ? (
                        <p>No interviews yet</p>
                    ) : interviews.map(renderInterviews)}
                </div>
            </div>

            <SetupInterviewModal isOpen={isSetupOpen} setIsOpen={setIsSetupOpen} refreshKey={refreshKey} setRefreshKey={setRefreshKey} />

            <dialog ref={confirmRef} id="confirm-modal" onClick={handleBackdropClick}>
                <div className="p-8 px-9" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">Cancel interview?</h2>
                        <button
                            className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-gray-400 text-xs cursor-pointer flex items-center justify-center transition hover:border-[#ef4444] hover:text-[#ef4444]"
                            onClick={() => setConfirmInterviewId(null)}
                        >
                            &#10005;
                        </button>
                    </div>
                    <div className="flex flex-col gap-4">
                        <p>This interview will be permanently cancelled and cannot be undone.</p>
                    </div>
                    <div className="flex justify-end gap-2.5 mt-6">
                        <button type="button" className="btn-cancel" onClick={() => setConfirmInterviewId(null)}>
                            Keep
                        </button>
                        <button className="btn-danger" onClick={handleDeleteInterview}>Cancel interview</button>
                    </div>
                </div>
            </dialog>
        </>
    );
}
