import { useEffect, useRef, useState, useContext } from "react";
import { AuthContext } from "./AuthProvider";
import SetupInterviewModal from "./SetupInterviewModal";

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

export default function RecruiterInterviews() {
    const authContext = useContext(AuthContext);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [candidateMap, setCandidateMap] = useState<
        Record<string, CandidateData>
    >({});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const confirmRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        async function getInterviews() {
            // setInterviews([{id: 1, recruiterId: 2, candidateId: 1, jobTitle: "Big Boss", status: "scheduled", dueDate: new Date("2026-05-18")}])
            try {
                const result = await authContext?.axiosInstance.get(
                    `/api/v1/interview/candidat-interviews/${authContext.userId}`,
                );
                console.log(result?.data);
                const parsed = (result?.data).map((item) => ({
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
        const uniqueCandidateIds = [
            ...new Set(interviews.map((i) => i.candidateId)),
        ];

        uniqueCandidateIds.forEach(async (candidateId) => {
            if (candidateMap[candidateId] || !candidateId) return; // already fetched
            try {
                const res = await authContext?.axiosInstance.get(
                    `api/v1/user/${candidateId}/public`,
                );
                setCandidateMap((prev) => ({
                    ...prev,
                    [candidateId]: res?.data,
                }));
            } catch (error) {
                // handle error
            }
        });
    }, [interviews]);

    useEffect(() => {
        if (isConfirmOpen) {
            confirmRef.current?.showModal();
        } else {
            confirmRef.current?.close();
        }
    }, [isConfirmOpen]);

    function handleBackdropClick(e) {
        if (e.target === confirmRef.current) {
            setIsConfirmOpen(false);
        }
    }

    function renderInterviews(interview: Interview) {
        if (interview.status === "completed") {
            return (
                <div className="interview-entry" key={interview.id}>
                    <div className="interview-entry-left">
                        <div className="avatar">PL</div>
                        <div className="interview-entry-info">
                            <div className="interview-entry-name">
                                {candidateMap[interview.candidateId]
                                    ?.firstname ?? "-"}{" "}
                                {candidateMap[interview.candidateId]?.lastname}
                            </div>
                            <div className="interview-entry-pos">
                                {interview.jobTitle}
                            </div>
                        </div>
                    </div>
                    <div className="interview-entry-right interview-entry-right--stacked">
                        <div className="interview-entry-right-top">
                            <span className="interview-entry-question">
                                Design a Rate Limiter
                            </span>
                            <span className="status-badge status-completed">
                                {interview.status}
                            </span>
                            <button
                                className="btn-delete"
                                title="Delete interview"
                                onClick={() => setIsConfirmOpen(true)}
                            >
                                Delete
                            </button>
                        </div>
                        <div className="interview-mini-report">
                            <div className="interview-mini-score">78%</div>
                            <div className="interview-mini-bars">
                                <div className="mini-bar-row">
                                    <span className="mini-bar-label">
                                        Architecture
                                    </span>
                                    <div className="mini-bar-wrap">
                                        <div
                                            className="mini-bar"
                                            style={{ width: "80%" }}
                                        ></div>
                                    </div>
                                    <span className="mini-bar-score">4/5</span>
                                </div>
                                <div className="mini-bar-row">
                                    <span className="mini-bar-label">
                                        Scalability
                                    </span>
                                    <div className="mini-bar-wrap">
                                        <div
                                            className="mini-bar amber"
                                            style={{ width: "60%" }}
                                        ></div>
                                    </div>
                                    <span className="mini-bar-score">3/5</span>
                                </div>
                                <div className="mini-bar-row">
                                    <span className="mini-bar-label">
                                        Reasoning
                                    </span>
                                    <div className="mini-bar-wrap">
                                        <div
                                            className="mini-bar"
                                            style={{ width: "80%" }}
                                        ></div>
                                    </div>
                                    <span className="mini-bar-score">4/5</span>
                                </div>
                            </div>
                            <a href="report.html">
                                <button className="btn-interview">
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
                <div className="interview-entry" key={interview.id}>
                    <div className="interview-entry-left">
                        <div className="avatar">SK</div>
                        <div className="interview-entry-info">
                            <div className="interview-entry-name">
                                {candidateMap[interview.candidateId]
                                    ?.firstname ?? "-"}{" "}
                                {candidateMap[interview.candidateId]?.lastname}
                            </div>
                            <div className="interview-entry-pos">
                                {interview.jobTitle}
                            </div>
                        </div>
                    </div>
                    <div className="interview-entry-right">
                        <span className="interview-entry-question">
                            Design a Distributed Cache
                        </span>
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
                        {overDue ? (
                            <button
                                className="btn-delete"
                                title="Cancel interview"
                                onClick={() => setIsConfirmOpen(true)}
                            >
                                Delete
                            </button>
                        ) : (
                            ""
                        )}
                    </div>
                </div>
            );
        }
    }

    return (
        <>
            <div className="max-w-[900px] mx-auto py-10 px-6">
                <div className="page-header">
                <h1>Interviews</h1>
                <button
                    className="btn-mock"
                    onClick={() => setIsSetupOpen(true)}
                >
                    Schedule interview
                </button>
            </div>
                <div className="flex flex-col gap-3">
                    {interviews.map(renderInterviews)}
                </div>
            </div>

            <SetupInterviewModal
                isOpen={isSetupOpen}
                setIsOpen={setIsSetupOpen}
            />

            <dialog
                ref={confirmRef}
                id="confirm-modal"
                onClick={handleBackdropClick}
            >
                <div onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Cancel interview?</h2>
                        <button
                            className="modal-close"
                            onClick={() => setIsConfirmOpen(false)}
                        >
                            &#10005;
                        </button>
                    </div>
                    <div className="modal-body">
                        <p>
                            This interview will be permanently cancelled and
                            cannot be undone.
                        </p>
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn-cancel"
                            onClick={() => setIsSetupOpen(false)}
                        >
                            Keep
                        </button>
                        <button className="btn-danger">Cancel interview</button>
                    </div>
                </div>
            </dialog>
        </>
    );
}
