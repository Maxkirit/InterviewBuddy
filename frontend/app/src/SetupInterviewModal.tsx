import { useRef, useState, useContext, useEffect, type SubmitEvent } from "react";
import { AuthContext } from "./AuthProvider";
import z from "zod";

type Connection = {
    user_id: number,
    firstname: string,
    lastname: string,
    profile_pic_url: string | null,
    organization: string | null,
};

const InterviewSchema = z.object({
    recruiter_id: z.int().min(1),
    candidate_id: z.int().min(1),
    question_id: z.int().min(1),
    job_title: z.string(),
    due_date: z.date(),
});

export default function SetupInterviewModal({ isOpen, setIsOpen }: {isOpen: boolean, setIsOpen: (open: boolean) => void}) {
    const authContext = useContext(AuthContext);
    const setupRef = useRef<HTMLDialogElement>(null);
    const [connections, setConnections] = useState<Connection[]>([])
    const [position, setPosition] = useState<string>("");
    const [candidate, setCandidate] = useState<number>();
    const [question, setQuestion] = useState<string>("");
    const [dueDate, setDueDate] = useState<string>("");

    useEffect(() => {
        async function getConnections() {
            try {
                const res = await authContext?.axiosInstance.get(`/api/v1/user/${authContext.userId}/connections`);
                setConnections(res?.data);
            } catch (error) {
                
            }
        }

        getConnections();
    }, []);

    useEffect(() => {
        if (isOpen) {
            setupRef.current?.showModal();
        } else {
            setupRef.current?.close();
        }
    }, [isOpen]);

    function handleBackdropClick(e) {
        if (e.target === setupRef.current) {
            setIsOpen(false);
        }
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        try {
            const input = {
                recruiter_id: authContext?.userId,
                // candidate_id: ,
                question_id: question,
                job_title: position,
                due_date: dueDate ? new Date(dueDate) : null,
            };
            InterviewSchema.parse(input);
            await authContext?.axiosInstance.post(
                "http://localhost:3000/api/v1/inteview/real-interview",
                input,
            );
        } catch (error) {
            console.log("in error path");
            console.log(error);
            // display error banner
        }
    }

    function renderCandidateOptions(connection: Connection) {
        return (
            <option value={connection.user_id}>{connection.firstname} {connection.lastname}</option>
        );
    }

    return (
        <dialog ref={setupRef} id="setup-modal" onClick={handleBackdropClick}>
            <div onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Schedule interview</h2>
                    <button
                        className="modal-close"
                        onClick={() => setIsOpen(false)}
                    >
                        &#10005;
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label htmlFor="modal-position">Position</label>
                            <input
                                type="text"
                                id="modal-position"
                                placeholder="e.g. Backend Engineer"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="modal-candidate">Candidate</label>
                            <select
                                id="modal-candidate"
                                value={candidate}
                                onChange={(e) => setCandidate(parseInt(e.target.value))}
                            >
                                <option value={0} disabled selected>
                                    Select a candidate…
                                </option>
                                {connections.map(renderCandidateOptions)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="modal-question">Question</label>
                            <select
                                id="modal-question"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                            >
                                <option value="" disabled selected>
                                    Select a question…
                                </option>
                                <option>Design a URL Shortener</option>
                                <option>Design a Rate Limiter</option>
                                <option>Design a Notification System</option>
                                <option>Design a Distributed Cache</option>
                                <option>Design a News Feed</option>
                                <option>Design a Chat Application</option>
                                <option>Design an API Gateway</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="modal-due-date">Due date</label>
                            <input
                                type="date"
                                id="modal-due-date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            className="btn-cancel"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary btn-primary--compact"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
}
