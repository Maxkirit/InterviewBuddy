import { useEffect, useRef, useState, useContext } from "react";
import { AuthContext } from "./AuthProvider";

type InterviewData = {
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

export default function CandidateOfficialInterview() {
    const authContext = useContext(AuthContext);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [recruiterMap, setRecruiterMap] = useState<Record<string, RecruiterData>>({});
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        async function getInterviews() {
            // setInterviews([{id: 1, recruiterId: 2, candidateId: 1, jobTitle: "Big Boss", status: "scheduled", dueDate: new Date("2026-05-18")}])
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
                // error banner
            }
        }
        getInterviews();
    }, []);

    useEffect(() => {
        const uniqueRecruiterIds = [...new Set(interviews.map(i => i.recruiterId))];
        
        uniqueRecruiterIds.forEach(async (recruiterId) => {
            if (recruiterMap[recruiterId] || !recruiterId) return; // already fetched
            try {
                const res = await authContext?.axiosInstance.get(
                    `api/v1/user/${recruiterId}/public`
                );
                setRecruiterMap((prev) => ({ ...prev, [recruiterId]: res?.data }));
            } catch (error) {
                // handle error
            }
        });
    }, [interviews]);

    useEffect(() => {
        if (isOpen) {
            ref.current?.showModal();
        } else {
            ref.current?.close();
        }
    }, [isOpen]);

    function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
        if (e.target === ref.current) {
            setIsOpen(false);
        }
    }

    function renderInterviews(interview: Interview) {
        // let recruiter;
        // try {
        //     recruiter = await authContext?.axiosInstance.get(
        //         `api/v1/user/${interview.recruiterId}/public`
        //     );
        // } catch (error) {
        //     // error banner or default value
        // }
        if (interview.status === "completed") {
            return (
                <div
                    key={interview.id}
                    className="bg-white border border-[#e4e8f0] rounded-[14px] px-6 py-5 flex items-center gap-6"
                >
                    <div className="flex items-center gap-3.5 flex-[0_0_240px]">
                        <div className="avatar">MB</div>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[0.95rem] font-semibold text-[#1a1d2e]">
                                {recruiterMap[interview.recruiterId]?.firstname ?? "-"} {recruiterMap[interview.recruiterId]?.lastname}
                            </div>
                            <div className="text-[0.8rem] text-gray-500">
                                {recruiterMap[interview.recruiterId]?.organization ?? "-"} ·{" "}
                                {interview.jobTitle}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center gap-5 justify-end">
                        <span className="status-badge status-completed">
                            {interview.status}
                        </span>
                        <div className="flex items-center gap-[18px]">
                            <div className="text-[1.15rem] font-bold text-[#4f6ef7] min-w-[44px] text-center">
                                78%
                            </div>
                            <div className="flex flex-col gap-[5px] w-[180px]">
                                <div className="flex items-center gap-1.5 text-[0.7rem] text-gray-500">
                                    <span className="w-[80px] shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">
                                        Architecture
                                    </span>
                                    <div className="flex-1 h-1 bg-[#f0f3ff] rounded-sm">
                                        <div
                                            className="h-full bg-[#4f6ef7] rounded-sm"
                                            style={{ width: "80%" }}
                                        ></div>
                                    </div>
                                    <span className="w-6 text-right shrink-0">
                                        4/5
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[0.7rem] text-gray-500">
                                    <span className="w-[80px] shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">
                                        Scalability
                                    </span>
                                    <div className="flex-1 h-1 bg-[#f0f3ff] rounded-sm">
                                        <div
                                            className="h-full bg-[#f59e0b] rounded-sm"
                                            style={{ width: "60%" }}
                                        ></div>
                                    </div>
                                    <span className="w-6 text-right shrink-0">
                                        3/5
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[0.7rem] text-gray-500">
                                    <span className="w-[80px] shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">
                                        Reasoning
                                    </span>
                                    <div className="flex-1 h-1 bg-[#f0f3ff] rounded-sm">
                                        <div
                                            className="h-full bg-[#4f6ef7] rounded-sm"
                                            style={{ width: "80%" }}
                                        ></div>
                                    </div>
                                    <span className="w-6 text-right shrink-0">
                                        4/5
                                    </span>
                                </div>
                            </div>
                            <a href="report.html">
                                <button className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#4f6ef7] text-[#4f6ef7] hover:bg-[#4f6ef7] hover:text-white">
                                    See report
                                </button>
                            </a>
                        </div>
                    </div>
                </div>
            );
        } else {
            const overDue = interview.dueDate < new Date();
            return (
                <div
                    key={interview.id}
                    className="bg-white border border-[#e4e8f0] rounded-[14px] px-6 py-5 flex items-center gap-6"
                >
                    <div className="flex items-center gap-3.5 flex-[0_0_240px]">
                        <div className="avatar">JL</div>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[0.95rem] font-semibold text-[#1a1d2e]">
                                {recruiterMap[interview.recruiterId]?.firstname ?? "-"} {recruiterMap[interview.recruiterId]?.lastname}
                            </div>
                            <div className="text-[0.8rem] text-gray-500">
                                {recruiterMap[interview.recruiterId]?.organization ?? "-"} ·{" "}
                                {interview.jobTitle}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center gap-5 justify-end">
                        <span
                            className={
                                overDue
                                    ? "text-[0.75rem] text-[#ef4444] font-semibold whitespace-nowrap"
                                    : "text-[0.75rem] text-gray-400 whitespace-nowrap"
                            }
                        >
                            Due {interview.dueDate.toDateString()}
                        </span>
                        <span
                            className={
                                overDue
                                    ? "status-badge status-overdue"
                                    : "status-badge status-pending"
                            }
                        >
                            {overDue ? "Past due date" : "Pending"}
                        </span>
                        <button
                            className="border-0 bg-[#4f6ef7] text-white font-semibold cursor-pointer transition hover:bg-[#3d5ce6] disabled:bg-[#e4e8f0] disabled:text-gray-400 disabled:cursor-not-allowed px-[18px] py-[7px] rounded-lg text-sm"
                            onClick={() => setIsOpen(true)}
                            disabled={overDue}
                        >
                            Start
                        </button>
                    </div>
                </div>
            );
        }
    }

    return (
        <>
            <div className="max-w-[900px] mx-auto py-10 px-6">
                <div className="flex items-baseline gap-3 mb-7">
                    <h1 className="text-[1.75rem] font-bold text-[#1a1d2e]">
                        Interviews
                    </h1>
                </div>
                <div className="flex flex-col gap-3">
                    {interviews.filter((item) => item.status !== "mock").map(renderInterviews)}
                </div>
            </div>

            <dialog ref={ref} id="start-modal" onClick={handleBackdropClick}>
                <div className="p-8 px-9" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">
                            Start interview?
                        </h2>
                        <button
                            className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-gray-400 text-xs cursor-pointer flex items-center justify-center transition hover:border-[#ef4444] hover:text-[#ef4444]"
                            onClick={() => setIsOpen(false)}
                        >
                            &#10005;
                        </button>
                    </div>
                    <div className="flex flex-col gap-4">
                        <p>You are about to start an official interview.</p>
                        <p className="mt-2.5 px-3.5 py-2.5 bg-[#fef3c7] border border-[#fcd34d] rounded-lg text-[0.825rem] text-[#92400e] leading-relaxed">
                            Once started, the interview cannot be paused or
                            restarted. Make sure you are in a quiet environment
                            and have enough time to complete it before
                            continuing.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2.5 mt-6">
                        <button
                            className="btn-cancel"
                            onClick={() => setIsOpen(false)}
                        >
                            Go back
                        </button>
                        <a href="">
                            <button className="btn-primary px-6 py-[9px]">
                                Start interview
                            </button>
                        </a>
                    </div>
                </div>
            </dialog>
        </>
    );
}
