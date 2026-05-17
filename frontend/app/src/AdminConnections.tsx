import { useEffect, useState, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

type ConnectionData = {
	recruiter_id: number;
	candidate_id: number;
	status: string;
	is_active: boolean;
	users_connections_recruiter_idTousers: {
		user_id: number;
		firstname: string;
		lastname: string;
		profile_pic_url: string | null;
		organization: string | null;
	};
	users_connections_candidate_idTousers: {
		user_id: number;
		firstname: string;
		lastname: string;
		profile_pic_url: string | null;
    };
}

type ConfirmState = {
	open: boolean;
	recruiterId: number | null;
	candidateId: number | null;
}

export default function AdminConnections(){
	const authContext = useContext(AuthContext);
	const [connections, setConnections] = useState<ConnectionData[]>([]);
	const confirmRef = useRef<HTMLDialogElement>(null);
	const [confirm, setConfirm] = useState<ConfirmState>({ open: false, recruiterId: null, candidateId: null });

	useEffect(() => {
		async function getConnections() {
			try {
				const result = await authContext?.axiosInstance.get(
					`/api/v1/user/all/connections`
				);
				//auto parsing if data is type
				setConnections(result?.data.connections);
			} catch (error) {
				console.log("in error path");
				// error banner
			}
		}
		getConnections();
	}, []);

	async function handleDeleteConnection(recruiterId: number, candidateId: number) {
		try {
			await authContext?.axiosInstance.patch(
				`/api/v1/user/connections/${recruiterId}/${candidateId}`
			);
			setConnections((prev) => prev.filter(c => !(c.recruiter_id === recruiterId && c.candidate_id === candidateId)));
		} catch (e) {
			console.log("error deleting connection");
		} finally {
			setConfirm({ open: false, recruiterId: null, candidateId: null });
			confirmRef.current?.close();
		}
	}

	function openConfirm(recruiterId: number, candidateId: number) {
		setConfirm({ open: true, recruiterId, candidateId, });
		confirmRef.current?.showModal();
	}

	return (
		<div className="max-w-[900px] mx-auto py-10 px-6">
			<h1 className="text-[1.75rem] font-bold text-[#1a1d2e] mb-7">Connections</h1>
			<div className="flex flex-col gap-3">
				{connections.length === 0 ? (
					<p>No connections yet</p>
				) : (
					connections.map((conn) => {
						const rec = conn.users_connections_recruiter_idTousers;
						const can = conn.users_connections_candidate_idTousers;
						return (
							<div key={`${conn.recruiter_id}-${conn.candidate_id}`} className="bg-white border border-[#e4e8f0] rounded-[14px] px-6 py-5 flex items-center justify-between">
								{/* RIGHT: Recruiter side */}
								<Link to={`/profile/${rec.user_id}`} className="flex items-center gap-3 no-underline">
									<div className="avatar relative overflow-hidden">
										{rec.profile_pic_url && (
											<img
												src={`/avatars/${rec.profile_pic_url}`}
												className="absolute inset-0 w-full h-full object-cover rounded-full"
												onError={(e) => e.currentTarget.remove()}
											/>
										)}
										{`${rec.firstname[0]}${rec.lastname[0]}`}
									</div>
									<div className="flex flex-col gap-0.5">
										<span className="text-[0.95rem] font-semibold text-[#1a1d2e]">
											{rec.firstname} {rec.lastname}
										</span>
										<span className="text-[0.8rem] text-gray-500">
											{rec.organization ?? "—"}
										</span>
									</div>
									<span className="status-badge status-recruiter">Recruiter</span>
								</Link>

								{/* CENTER: Delete button */}
								<button className="px-4 py-[7px] rounded-lg border border-[#ef4444] text-[#ef4444] text-[0.85rem] font-medium cursor-pointer hover:bg-[#ef4444] hover:text-white transition"
									onClick={() => openConfirm(conn.recruiter_id, conn.candidate_id)}>
    							Delete Connection
								</button>

								{/* LEFT: Candidate side */}
								<Link to={`/profile/${can.user_id}`} className="flex items-center gap-3 no-underline">
									<span className="status-badge status-candidate">Candidate</span>
									<div className="flex flex-col gap-0.5 text-right">
										<span className="text-[0.95rem] font-semibold text-[#1a1d2e]">
											{can.firstname} {can.lastname}
										</span>
									</div>
									<div className="avatar relative overflow-hidden">
										{can.profile_pic_url && (
											<img
												src={`/avatars/${can.profile_pic_url}`}
												className="absolute inset-0 w-full h-full object-cover rounded-full"
												onError={(e) => e.currentTarget.remove()}
											/>
										)}
										{`${can.firstname[0]}${can.lastname[0]}`}
									</div>
								</Link>
							</div>
						);
					})
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
					<p className="text-sm text-gray-600">Are you sure you want to delete this connection?</p>
				</div>
				<div className="flex justify-end gap-2.5 px-6 py-4 border-t border-gray-100">
					<button className="btn-cancel" onClick={() => confirmRef.current?.close()}>
						Cancel
					</button>
					<button
						className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
						onClick={() => confirm.recruiterId !== null && confirm.candidateId !== null 
							&& handleDeleteConnection(confirm.recruiterId, confirm.candidateId)}
					>
						Delete
					</button>
				</div>
			</dialog>
		</div>
	);
}
