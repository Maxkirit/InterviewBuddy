import { useEffect, useState, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

type ConnectionData = {
	user_id: number;
	firstname: string;
	lastname: string;
	organization: string;
	profile_pic_url: string | null;
}

type ConfirmState = {
	open: boolean;
	recruiterId: number | null;
}

export default function CandidateListRecruiters() {
	const authContext = useContext(AuthContext);
	const [connections, setConnections] = useState<ConnectionData[]>([]);
	const confirmRef = useRef<HTMLDialogElement>(null);
	const [confirm, setConfirm] = useState<ConfirmState>({ open: false, recruiterId: null });

	useEffect(() => {
		async function getConnections() {
			try {
				const result = await authContext?.axiosInstance.get(
					`/api/v1/user/${authContext.userId}/connections`
				);
				const parsed = (result?.data.connections).map((item: ConnectionData) => ({
                    user_id: item.user_id,
                    firstname: item.firstname,
                    lastname: item.lastname,
                    organization: item.organization,
                    profile_pic_url: item.profile_pic_url,
                }));
				setConnections(parsed);
			} catch (error) {
				console.log("in error path");
                // error banner
			}
		}
		getConnections();
	}, []);

	async function handleDeleteConnection(recruiterId: number) {
		try {
			await authContext?.axiosInstance.patch(
				`/api/v1/user/connections/${authContext.userId}/${recruiterId}`
			);
			setConnections((prev) => prev.filter((c) => c.user_id !== recruiterId));
		} catch (e) {
			console.log("error deleting connection");
		} finally {
			setConfirm({ open: false, recruiterId: null });
			confirmRef.current?.close();
		}
	}

	function openConfirm(recruiterId: number) {
		setConfirm({ open: true, recruiterId });
		confirmRef.current?.showModal();
	}

	return (
		<div className="max-w-[900px] mx-auto py-10 px-6">
			<h1 className="text-[1.75rem] font-bold text-[#1a1d2e] mb-7">
				Recruiters
			</h1>
			<div className="flex flex-col gap-2">
				{connections.length === 0 ? (
					<p>No connections yet</p>
				) : (
					connections.map((conn) => (
						<Link key={conn.user_id} to={`/profile/${conn.user_id}`} className="no-underline bg-white border border-[#e4e8f0] rounded-[12px] px-5 py-3.5 flex items-center justify-between hover:border-[#4f6ef7] transition">
							<div className="flex items-center gap-3">
								<div className="avatar relative overflow-hidden">
									{conn?.profile_pic_url && (
										<img
											src={`https://localhost/avatars/${conn.profile_pic_url}`}
											className="absolute inset-0 w-full h-full object-cover rounded-full"
											onError={(e) => e.currentTarget.remove()}
										/>
									)}
									{conn ? `${conn.firstname[0]}${conn.lastname[0]}` : "??"}
								</div>
								<div className="flex flex-col gap-0.5">
									<span className="text-[0.975rem] font-semibold text-[#1a1d2e]">
										{conn.firstname} {conn.lastname}
									</span>
									<span className="text-[0.8rem] text-gray-500">
										{conn.organization ?? "—"}
									</span>
								</div>
							</div>
							<button
								className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
								onClick={() => openConfirm(conn.user_id)}
							>
								Delete
							</button>
						</Link>
					))
				)}
			</div>

			<dialog ref={confirmRef} className="rounded-xl p-0 w-[420px] shadow-xl backdrop:bg-black/50">
				<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
					<h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">Delete connection</h2>
					<button
						onClick={() => confirmRef.current?.close()}
						className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-[#9ca3af] text-xs cursor-pointer flex items-center justify-center hover:border-red-400 hover:text-red-400 transition"
					>
						✕
					</button>
				</div>
				<div className="px-6 py-5">
					<p className="text-sm text-gray-600">Are you sure you want to remove this recruiter from your connections?</p>
				</div>
				<div className="flex justify-end gap-2.5 px-6 py-4 border-t border-gray-100">
					<button className="btn-cancel" onClick={() => confirmRef.current?.close()}>
						Cancel
					</button>
					<button
						className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
						onClick={() => confirm.recruiterId !== null && handleDeleteConnection(confirm.recruiterId)}
					>
						Delete
					</button>
				</div>
			</dialog>
		</div>
	);
}
