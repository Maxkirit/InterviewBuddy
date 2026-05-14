import { useEffect, useState, useContext, type SubmitEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

type Question = {
    question_id: number,
    name: string,
    context: string,
    functional_req: string,
    non_functional_req: string,
    grading_guide: string,
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
    unfinished_text: string,
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

function sliderColor(v: number): string {
    if (v === 0) return "#b0b7c3";
    if (v <= 1)  return "#ef4444";
    if (v <= 2)  return "#f59e0b";
    if (v <= 3)  return "#eab308";
    if (v <= 4)  return "#22c55e";
    return "#4f6ef7";
}

function ScoreSlider({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
}) {
    const color = sliderColor(value);
    const fillPct = `${(value / 5) * 100}%`;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[0.875rem] font-semibold text-[#374151]">{label}</span>
                <span
                    className="text-[0.875rem] font-bold min-w-[36px] text-right tabular-nums"
                    style={{ color }}
                >
                    {value} / 5
                </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-[#e4e8f0]">
                <div
                    className="absolute left-0 top-0 h-2 rounded-full transition-all duration-150"
                    style={{ width: fillPct, background: color }}
                />
                <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="score-slider"
                    style={{ "--thumb-color": color } as React.CSSProperties}
                />
            </div>
            <div className="flex justify-between text-[0.7rem] text-[#b0b7c3] select-none">
                {[0, 1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}
            </div>
        </div>
    );
}

export default function GradingPage() {
    const authContext = useContext(AuthContext);
    const { interview_id } = useParams();
    const navigate = useNavigate();
    const [interview, setInterview] = useState<Interview>();
    const [candidate, setCandidate] = useState<CandidateData>();
    const [reqScore, setReqScore] = useState<number>(0);
    const [archiScore, setArchiScore] = useState<number>(0);
    const [scaleScore, setScaleScore] = useState<number>(0);
    const [resScore, setResScore] = useState<number>(0);
    const [note, setNote] = useState<string>("");

    useEffect(() => {
        async function getData() {
            try {
                const interviewData = await authContext?.axiosInstance.get(`/api/v1/interview/${interview_id}`);
                if (interviewData?.data.status !== "completed" && interviewData?.data.status !== "graded") {
                    navigate("/recruiter/interviews");
                }
                setInterview(interviewData?.data);
                const candidateData = await authContext?.axiosInstance.get(`api/v1/user/${interview?.candidate_id}/public`);
                setCandidate(candidateData?.data);
            } catch (error) {
                // error banner
                console.log(`in error path: ${error}`);
            }
        }

        getData();
    }, []);

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        try {

        } catch (error) {
            // error banner
            console.log(`in error path: ${error}`);
        }
    }

    const totalScore = reqScore + archiScore + scaleScore + resScore;
    const totalPct = Math.round((totalScore / 20) * 100);

    return (
        <div className="max-w-[820px] mx-auto px-6 py-10 flex flex-col gap-6">

            {/* Page header */}
            <div>
                <h1 className="text-[1.75rem] font-bold text-[#1a1d2e] mb-1">Grade Interview</h1>
                <p className="text-[0.875rem] text-[#6b7280]">
                    {candidate?.firstname} {candidate?.lastname} &nbsp;·&nbsp; {interview?.job_title}
                </p>
            </div>

            {/* 1 — Question */}
            <div className="bg-white border border-[#e4e8f0] rounded-[14px] px-7 py-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-7 h-7 rounded-full bg-[#eef1ff] text-[#4f6ef7] text-[0.8rem] font-bold flex items-center justify-center shrink-0">1</div>
                    <h2 className="text-[1.05rem] font-bold text-[#1a1d2e]">Interview Question</h2>
                </div>

                <p className="text-[1rem] font-semibold text-[#1a1d2e] mb-4">
                    {interview?.questions.name}
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f8f9ff] rounded-[10px] p-4">
                        <p className="text-[0.775rem] font-bold text-[#4f6ef7] uppercase tracking-[0.06em] mb-2.5">
                            Functional Requirements
                        </p>
                        <ul className="flex flex-col gap-1.5">
                            {interview?.questions.functional_req.split('\n\n').map((req, i) => (
                                <li key={i} className="flex items-baseline gap-2 text-[0.875rem] text-[#4b5563]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#4f6ef7] shrink-0 mt-[5px]" />
                                    {req}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-[#fffbf0] rounded-[10px] p-4">
                        <p className="text-[0.775rem] font-bold text-[#b45309] uppercase tracking-[0.06em] mb-2.5">
                            Non-Functional Requirements
                        </p>
                        <ul className="flex flex-col gap-1.5">
                            {interview?.questions.non_functional_req.split('\n\n').map((req, i) => (
                                <li key={i} className="flex items-baseline gap-2 text-[0.875rem] text-[#4b5563]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0 mt-[5px]" />
                                    {req}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* 2 — Candidate Answer */}
            <div className="bg-white border border-[#e4e8f0] rounded-[14px] px-7 py-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-7 h-7 rounded-full bg-[#eef1ff] text-[#4f6ef7] text-[0.8rem] font-bold flex items-center justify-center shrink-0">2</div>
                    <h2 className="text-[1.05rem] font-bold text-[#1a1d2e]">Candidate's Answer</h2>
                </div>
                <div className="bg-[#f4f6fb] rounded-[10px] px-5 py-5 text-[0.9rem] text-[#374151] leading-relaxed whitespace-pre-line">
                    {interview?.unfinished_text}
                </div>
            </div>

            {/* 3 — Guiding Questions */}
            <div className="bg-white border border-[#e4e8f0] rounded-[14px] px-7 py-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-7 h-7 rounded-full bg-[#eef1ff] text-[#4f6ef7] text-[0.8rem] font-bold flex items-center justify-center shrink-0">3</div>
                    <h2 className="text-[1.05rem] font-bold text-[#1a1d2e]">Evaluation Guide</h2>
                </div>

                <div className="flex flex-col gap-3.5">
                    {interview?.questions.grading_guide.split('\n\n').map((quest, i) => (
                        <div key={i} className="flex items-start gap-3 text-[0.9rem] text-[#374151]">
                            <div className="w-5 h-5 rounded-full bg-[#e4e8f0] text-[#6b7280] text-[0.7rem] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                            </div>
                            {quest}
                        </div>
                    ))}
                </div>
            </div>

            {/* 4 — Scoring */}
            <div className="bg-white border border-[#e4e8f0] rounded-[14px] px-7 py-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-7 h-7 rounded-full bg-[#eef1ff] text-[#4f6ef7] text-[0.8rem] font-bold flex items-center justify-center shrink-0">4</div>
                    <h2 className="text-[1.05rem] font-bold text-[#1a1d2e]">Score</h2>
                    <div className="ml-auto flex items-baseline gap-2">
                        <span className="text-[2rem] font-extrabold text-[#1a1d2e] leading-none">{totalPct}%</span>
                        <span className="text-[0.8rem] text-[#b0b7c3]">{totalScore} / 20</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-5">
                        <ScoreSlider label="Requirements Coverage" value={reqScore}  onChange={setReqScore} />
                        <ScoreSlider label="System Architecture"   value={archiScore} onChange={setArchiScore} />
                        <ScoreSlider label="Scalability"           value={scaleScore} onChange={setScaleScore} />
                        <ScoreSlider label="Tradeoffs & Reasoning" value={resScore}   onChange={setResScore} />
                    </div>

                    <div className="flex flex-col gap-1.5 mt-7">
                        <label className="form-label" htmlFor="notes">Personal Notes</label>
                        <textarea
                            id="notes"
                            className="form-input min-h-[110px] resize-y"
                            placeholder="Add your personal observations, strengths, areas for improvement…"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4">
                        <button type="submit" className="btn-primary px-6 py-[9px]">Submit grade</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
