import { useEffect, useRef, useState, useContext } from 'react';
import { AuthContext } from './AuthProvider';
import './styles/InterviewList.css';

type Interview = {
    id: number,
    recruiterId: number,
    candidateId: number,
    jobTitle: string,
    status: string,
    dueDate: Date,
}

export default function CandidateOfficialInterview() {
    const authContext = useContext(AuthContext);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDialogElement>(null);
    console.log("Candidate interviews mounts");

    useEffect(() => {
        async function getInterviews() {
            // setInterviews([{id: 1, recruiterId: 2, candidateId: 1, jobTitle: "Big Boss", status: "scheduled", dueDate: new Date("2026-05-18")}])
            try {
                const result = await authContext.axiosInstance.get(`/api/v1/interview/candidat-interviews/${authContext.userId}`);
                console.log(result.data);
                const parsed = (result.data).map((item) => ({
                    id: item.unique_interview_id,
                    recruiterId: item.recruiter_id,
                    candidateId: item.candidate_id,
                    jobTitle: item.job_title,
                    status: item.status,
                    dueDate: new Date(item.du_date),
                }));
                setInterviews(parsed);
            } catch (error) {
                console.log("in error path");
                // error banner
            }
        }
        getInterviews()
    }, []);

    useEffect(() => {
        if (isOpen) {
            ref.current.showModal();
        } else {
            ref.current.close();
        }
    }, [isOpen]);

    function handleBackdropClick(e) {
        if (e.target === ref.current) {
            setIsOpen(false);
        }
    }

    function renderInterviews(interview: Interview) {
        // get Recruiter info
        if (interview.status === "completed") {
            return (
                <div className="interview-entry" key={interview.id}>
                    <div className="interview-entry-left">
                        <div className="avatar">MB</div>
                        <div className="interview-entry-info">
                            <div className="interview-entry-name">Marcus Bell</div>
                            <div className="interview-entry-pos">
                                Vercel · {interview.jobTitle}
                            </div>
                        </div>
                    </div>
                    <div className="interview-entry-right">
                        <span className="status-badge status-completed"
                            >{interview.status}</span
                        >
                        <div className="interview-mini-report">
                            <div className="interview-mini-score">78%</div>
                            <div className="interview-mini-bars">
                                <div className="mini-bar-row">
                                    <span className="mini-bar-label"
                                        >Architecture</span
                                    >
                                    <div className="mini-bar-wrap">
                                        <div
                                            className="mini-bar"
                                            style={{width: "80%"}}
                                        ></div>
                                    </div>
                                    <span className="mini-bar-score">4/5</span>
                                </div>
                                <div className="mini-bar-row">
                                    <span className="mini-bar-label"
                                        >Scalability</span
                                    >
                                    <div className="mini-bar-wrap">
                                        <div
                                            className="mini-bar amber"
                                            style={{width: "60%"}}
                                        ></div>
                                    </div>
                                    <span className="mini-bar-score">3/5</span>
                                </div>
                                <div className="mini-bar-row">
                                    <span className="mini-bar-label"
                                        >Reasoning</span
                                    >
                                    <div className="mini-bar-wrap">
                                        <div
                                            className="mini-bar"
                                            style={{width: "80%"}}
                                        ></div>
                                    </div>
                                    <span className="mini-bar-score">4/5</span>
                                </div>
                            </div>
                            <a href="report.html"
                                ><button className="btn-interview">
                                    See report
                                </button></a
                            >
                        </div>
                    </div>
                </div>
            );
        } else {
            const overDue = interview.dueDate < new Date() ? true : false;
            return (
                <div className="interview-entry" key={interview.id}>
                    <div className="interview-entry-left">
                        <div className="avatar">JL</div>
                        <div className="interview-entry-info">
                            <div className="interview-entry-name">Jordan Lee</div>
                            <div className="interview-entry-pos">
                                Figma · {interview.jobTitle}
                            </div>
                        </div>
                    </div>
                    <div className="interview-entry-right">
                        <span className={overDue ? "interview-entry-due overdue" : "interview-entry-due"}>Due {interview.dueDate.toDateString()}</span>
                        <span className={overDue ? "status-badge status-overdue" : "status-badge status-pending"}>{overDue ? "Past due date" : "Pending"}</span>
                        <button
                            className="btn-mock"
                            style={{width: "auto", padding: "7px 18px"}}
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
            <div className="page" style={{maxWidth: "900px"}} >
                <div className="page-header">
                    <h1>Interviews</h1>
                </div>
                <div className="interview-list">
                    {interviews.map(renderInterviews)}                
                </div>
            </div>

            <dialog ref={ref} id="start-modal" onClick={handleBackdropClick}>
                <div className='modal-div' onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Start interview?</h2>
                        <button
                            className="modal-close"
                            onClick={() => setIsOpen(false)}
                        >
                            &#10005;
                        </button>
                    </div>
                    <div className="modal-body">
                        <p>You are about to start an official interview.</p>
                        <p className="modal-warning">
                            Once started, the interview cannot be paused or restarted.
                            Make sure you are in a quiet environment and have enough
                            time to complete it before continuing.
                        </p>
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn-cancel"
                            onClick={() => setIsOpen(false)}
                        >
                            Go back
                        </button>
                        <a href="">
                            <button className="btn-primary btn-primary--compact">
                                Start interview
                            </button>
                        </a>
                    </div>
                </div>
            </dialog>
        </>
    );
}