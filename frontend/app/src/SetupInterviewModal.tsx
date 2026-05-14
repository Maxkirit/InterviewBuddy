import {
    useRef,
    useState,
    useContext,
    useEffect,
    type SubmitEvent,
} from "react";
import { AuthContext } from "./AuthProvider";
import z from "zod";

type Connection = {
    user_id: number;
    firstname: string;
    lastname: string;
    profile_pic_url: string | null;
    organization: string | null;
};

type Question = {
    question_id: number;
    name: string;
};

const InterviewSchema = z.object({
    recruiter_id: z.int().min(1),
    candidate_id: z.int().min(1),
    question_id: z.int().min(1),
    job_title: z.string(),
    due_date: z.date(),
});

const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat" as const,
    backgroundPosition: "right 12px center",
};

export default function SetupInterviewModal({
    isOpen,
    setIsOpen,
    refreshKey,
    setRefreshKey,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    refreshKey: number,
    setRefreshKey: (key: number) => void;
}) {
    const authContext = useContext(AuthContext);
    const setupRef = useRef<HTMLDialogElement>(null);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [questionList, setQuestionList] = useState<Question[]>([]);
    const [position, setPosition] = useState<string>("");
    const [candidate, setCandidate] = useState<number>(0);
    const [question, setQuestion] = useState<number>(0);
    const [dueDate, setDueDate] = useState<string>("");

    useEffect(() => {
        async function getConnections() {
            try {
                const res = await authContext?.axiosInstance.get(
                    `/api/v1/user/${authContext.userId}/connections`,
                );
                setConnections(res?.data.connections);
            } catch (error) {
                // error banner
                console.log(`in error path: ${error}`);
            }
        }

        getConnections();
        console.log(connections);
    }, []);

    useEffect(() => {
        async function getQuestions() {
            try {
                const res = await authContext?.axiosInstance.get(
                    `/api/v1/interview/question/all`,
                );
                setQuestionList(res?.data);
            } catch (error) {
                // error banner
                console.log(`in error path: ${error}`);
            }
        }

        getQuestions();
        console.log(questionList);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setupRef.current?.showModal();
        } else {
            setupRef.current?.close();
        }
    }, [isOpen]);

    function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
        if (e.target === setupRef.current) {
            setIsOpen(false);
        }
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        try {
            const input = {
                recruiter_id: authContext?.userId,
                candidate_id: candidate,
                question_id: question,
                job_title: position,
                due_date: dueDate ? new Date(dueDate) : null,
            };
            InterviewSchema.parse(input);
            await authContext?.axiosInstance.post(
                "http://localhost:3000/api/v1/interview/real-interview",
                input,
            );
            setPosition("");
            setCandidate(0);
            setQuestion(0);
            setDueDate("");
            setRefreshKey(refreshKey + 1);
            setupRef.current?.close();
        } catch (error) {
            console.log("in error path");
            console.log(error);
            // display error banner
        }
    }

    function renderCandidateOptions(connection: Connection) {
        return (
            <option key={connection.user_id} value={connection.user_id}>
                {connection.firstname} {connection.lastname}
            </option>
        );
    }

    function renderQuestionOptions(question: Question) {
        return (
            <option key={question.question_id} value={question.question_id}>
                {question.name}
            </option>
        );
    }

    return (
        <dialog ref={setupRef} id="setup-modal" onClick={handleBackdropClick}>
            <div className="p-8 px-9" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">
                        Schedule interview
                    </h2>
                    <button
                        className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-gray-400 text-xs cursor-pointer flex items-center justify-center transition hover:border-[#ef4444] hover:text-[#ef4444]"
                        onClick={() => setIsOpen(false)}
                    >
                        &#10005;
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4">
                        <div className="form-field">
                            <label
                                htmlFor="modal-position"
                                className="form-label"
                            >
                                Position
                            </label>
                            <input
                                className="form-input"
                                type="text"
                                id="modal-position"
                                placeholder="e.g. Backend Engineer"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                            />
                        </div>
                        <div className="form-field">
                            <label
                                htmlFor="modal-candidate"
                                className="form-label"
                            >
                                Candidate
                            </label>
                            <select
                                className="form-input appearance-none bg-white cursor-pointer pr-9"
                                style={selectArrowStyle}
                                id="modal-candidate"
                                value={candidate}
                                onChange={(e) =>
                                    setCandidate(parseInt(e.target.value))
                                }
                            >
                                <option value={0} disabled>
                                    Select a candidate…
                                </option>
                                {connections.map(renderCandidateOptions)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label
                                htmlFor="modal-question"
                                className="form-label"
                            >
                                Question
                            </label>
                            <select
                                className="form-input appearance-none bg-white cursor-pointer pr-9"
                                style={selectArrowStyle}
                                id="modal-question"
                                value={question}
                                onChange={(e) =>
                                    setQuestion(parseInt(e.target.value))
                                }
                            >
                                <option value={0} disabled>
                                    Select a question…
                                </option>
                                {questionList.map(renderQuestionOptions)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label
                                htmlFor="modal-due-date"
                                className="form-label"
                            >
                                Due date
                            </label>
                            <input
                                className="form-input"
                                type="date"
                                id="modal-due-date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2.5 mt-6">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary px-6 py-[9px]"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
}
