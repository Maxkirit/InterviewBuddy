import { useEffect, useState, useContext,  } from "react"; //useRef
import { Link } from "react-router-dom";
import { AuthContext } from "./AuthProvider";
import { type InterviewData } from "./CandidateOfficialInterview";
import { type User } from "./AdminUser";
// import { type ConfirmState } from "./AdminConnections";
import ErrorBanner from './ErrorBanner';

export default function AdminInterviews(){
	const authContext = useContext(AuthContext);
	const [interviews, setInterviews] = useState<InterviewData[]>([]);
	// const confirmRef = useRef<HTMLDialogElement>(null);
	// const [confirm, setConfirm] = useState<ConfirmState>({ open: false, recruiterId: null, candidateId: null });
	const [users, setUsers] = useState<User[]>([]);
	// const [selectUser, setSelectUser] = useState<User | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function getData() {
			try {
				const userRes = await authContext?.axiosInstance.get(
					`/api/v1/user/all`
				);
				setUsers(userRes?.data);
				
				const intRes = await authContext?.axiosInstance.get(
					`/api/v1/interview/real-interviews/all`
				);
				const parsed = (intRes?.data).map((item: InterviewData) => ({
                    unique_interview_id: item.unique_interview_id,
                    recruiter_id: item.recruiter_id,
                    candidate_id: item.candidate_id,
                    job_title: item.job_title,
                    status: item.status,
                    due_date: new Date(item.due_date),
                }));
				setInterviews(parsed);
			} catch (error) {
				console.log("in error path");
				setError("Failed to load interviews. Please try again.");
			}
		}
		getData();
	}, []);

	// async function handleDeleteInterview(recruiterId: number, candidateId: number) {
	// 	try {
	// 		await authContext?.axiosInstance.patch(
	// 			`/api/v1/user/connections/${recruiterId}/${candidateId}`//CHANGE
	// 		);
	// 		setInterviews((prev) => prev.filter(c => !(c.recruiter_id === recruiterId && c.candidate_id === candidateId)));
	// 	} catch (e) {
	// 		console.log("error deleting interview");
	// 	} finally {
	// 		setConfirm({ open: false, recruiterId: null, candidateId: null });
	//		setError("Failed to delete Interview. Please try again.");
	// 		confirmRef.current?.close();
	// 	}
	// }

	// function openConfirm(recruiterId: number, candidateId: number) {
	// 	setConfirm({ open: true, recruiterId, candidateId, });
	// 	confirmRef.current?.showModal();
	// }

// {rec?.firstname ?? "Unknown"} {rec?.lastname ?? ""}
// {can?.firstname ?? "Unknown"} {can?.lastname ?? ""}
	return (
		<>
			{error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
			<div className="max-w-[900px] mx-auto py-10 px-6">
				<h1 className="text-[1.75rem] font-bold text-[#1a1d2e] mb-7">Interviews</h1>
				<div className="flex flex-col gap-3">
					{interviews.length === 0 ? (
						<p>No Interviews yet</p>
					) : (
						interviews.map((inter) => {
							const rec = users.find(u => u.user_id === inter.recruiter_id);
							const can = users.find(u => u.user_id === inter.candidate_id);
							
							return (
								<div key={inter.unique_interview_id} className="bg-white border border-[#e4e8f0] rounded-[14px] px-6 py-5 flex items-center justify-between">
									{/* RIGHT: Recruiter side */}
									<Link to={`/profile/${rec?.user_id}`} className="flex items-center gap-3 no-underline">
										<div className="avatar relative overflow-hidden">
											{rec?.profile_pic_url && (
												<img
													src={`/avatars/${rec.profile_pic_url}`}
													className="absolute inset-0 w-full h-full object-cover rounded-full"
													onError={(e) => e.currentTarget.remove()}
												/>
											)}
											{`${rec?.firstname?.[0] ?? "U"}${rec?.lastname?.[0] ?? "K"}`}
										</div>
										<div className="flex flex-col gap-0.5">
											<span className="text-[0.95rem] font-semibold text-[#1a1d2e]">
												{rec?.firstname ?? "Unknown"} {rec?.lastname ?? ""}
											</span>
											<span className="text-[0.8rem] text-gray-500">
												{rec?.organization ?? "—"}
											</span>
										</div>
										<span className="status-badge status-recruiter">Recruiter</span>
									</Link>

									{/* CENTER: Delete button */}
									<button className="px-4 py-[7px] rounded-lg border border-[#ef4444] text-[#ef4444] text-[0.85rem] font-medium cursor-pointer hover:bg-[#ef4444] hover:text-white transition"
										// onClick={() => openConfirm(inter.recruiter_id, inter.candidate_id)}
										>
									Delete Interview
									</button>

									{/* LEFT: Candidate side */}
									<Link to={`/profile/${can?.user_id}`} className="flex items-center gap-3 no-underline">
										<span className="status-badge status-candidate">Candidate</span>
										<div className="flex flex-col gap-0.5 text-right">
											<span className="text-[0.95rem] font-semibold text-[#1a1d2e]">
												{can?.firstname?? "Unknown"} {can?.lastname ?? ""}
											</span>
										</div>
										<div className="avatar relative overflow-hidden">
											{can?.profile_pic_url && (
												<img
													src={`/avatars/${can.profile_pic_url}`}
													className="absolute inset-0 w-full h-full object-cover rounded-full"
													onError={(e) => e.currentTarget.remove()}
												/>
											)}
											{`${can?.firstname[0] ?? "U"}${can?.lastname[0] ?? "K"}`}
										</div>
									</Link>
								</div>
							);
						})
					)}
				</div>

				{/* <dialog ref={confirmRef} className="rounded-xl p-0 w-[420px] shadow-xl backdrop:bg-black/50">
					<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
						<h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">Delete interview</h2>
						<button
							onClick={() => confirmRef.current?.close()}
							className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-[#9ca3af] text-xs cursor-pointer flex items-center justify-center hover:border-red-400 hover:text-red-400 transition"
						>
							✕
						</button>
					</div>
					<div className="px-6 py-5">
						<p className="text-sm text-gray-600">Are you sure you want to delete this interview?</p>
					</div>
					<div className="flex justify-end gap-2.5 px-6 py-4 border-t border-gray-100">
						<button className="btn-cancel" onClick={() => confirmRef.current?.close()}>
							Cancel
						</button>
						<button
							className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
							onClick={() => confirm.recruiterId !== null && confirm.candidateId !== null 
								&& handleDeleteInterview(confirm.recruiterId, confirm.candidateId)}
						>
							Delete
						</button>
					</div>
				</dialog> */}
			</div>
		</>
	);
}
