import { useEffect, useState, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "./AuthProvider";
import ErrorBanner from "./ErrorBanner";

type ConnectionData = {
	user_id: number;
	firstname: string;
	lastname: string;
	organization: string;
	profile_pic_url: string;
	last_seen: string;
}

type ConfirmState = {
	open: boolean;
	candidateId: number | null;
}

export default function RecruiterListCandidates() {
	const authContext = useContext(AuthContext);
	const [connections, setConnections] = useState<ConnectionData[]>([]);
	const modalRef = useRef<HTMLDialogElement>(null);
	const confirmRef = useRef<HTMLDialogElement>(null);
	const [link, setlink] = useState<string>("");
	const [confirm, setConfirm] = useState<ConfirmState>({ open: false, candidateId: null });
	const [error, setError] = useState<string | null>(null);

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
					last_seen: item.last_seen,
				}));
				setConnections(parsed);
			} catch (error) {
				console.log("in error path");
				setError("Failed to load connections. Please try again.");
			}
		}
		getConnections();
	}, []);

	async function handleSharelink(){
		console.log("test debeug");
		try{
			const result = await authContext?.axiosInstance.get(`/api/v1/user/link/generate`)
			setlink(result?.data.url);
			console.log(result?.data);
			modalRef.current?.showModal();
		} catch(e){
			setError("Failed to load invite link. Please close and try again.");
		}
	}

	async function handleDeleteConnection(candidateId: number) {
		try {
			await authContext?.axiosInstance.patch(
				`/api/v1/user/connections/${authContext.userId}/${candidateId}`
			);
			setConnections((prev) => prev.filter((c) => c.user_id !== candidateId));
		} catch (e) {
			setError("Failed to delete connections. Please try again.");
		} finally {
			setConfirm({ open: false, candidateId: null });
			confirmRef.current?.close();
		}
	}

	function openConfirm(candidateId: number) {
		setConfirm({ open: true, candidateId });
		confirmRef.current?.showModal();
	}

	function copyLink() {
    	const input = document.getElementById("invite-link") as HTMLInputElement;
	    navigator.clipboard.writeText(input.value);
  	}

	return (
		<>
			{error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
			<div className="max-w-[900px] mx-auto py-10 px-6">
				<div className="flex items-baseline gap-3 mb-7">
					<h1 className="text-[1.75rem] font-bold text-[#1a1d2e]">Candidates</h1>
					<button
						className="btn-primary px-5 py-[9px] text-sm"
						type="button"
						onClick={handleSharelink}
					>
						Share invite link
					</button>
				</div>
				<div className="flex flex-col gap-2">
					{connections.length === 0 ? (
						<p>No connections yet</p>
					) : (
						connections.map((conn) => {
							const isOnline = Date.now() - new Date(conn.last_seen).getTime() < 60_000;
							return (
								<Link key={conn.user_id} to={`/profile/${conn.user_id}`} className="no-underline bg-white border border-[#e4e8f0] rounded-[12px] px-5 py-3.5 flex items-center justify-between hover:border-[#4f6ef7] transition">
									<div className="flex items-center gap-3">
										<div className="avatar relative overflow-hidden">
											{conn?.profile_pic_url && (
												<img
													src={`/avatars/${conn.profile_pic_url}`}
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
									<div className="flex items-center gap-3">
										<div className="w-3 h-3 rounded-full shrink-0"
											style={{ background: isOnline ? "#22c55e" : "#d1d5db" }} />
										<button
											className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												openConfirm(conn.user_id);
											}}
										>
											Delete
										</button>
									</div>
								</Link>
							)
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
					<p className="text-sm text-gray-600">Are you sure you want to remove this candidate from your connections? This will also cancel all the interviews you have with them.</p>
				</div>
				<div className="flex justify-end gap-2.5 px-6 py-4 border-t border-gray-100">
					<button className="btn-cancel" onClick={() => confirmRef.current?.close()}>
						Cancel
					</button>
					<button
						className="px-4 py-[7px] rounded-lg bg-white text-[0.85rem] font-medium cursor-pointer whitespace-nowrap transition border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
						onClick={() => confirm.candidateId !== null && handleDeleteConnection(confirm.candidateId)}
					>
						Delete
					</button>
				</div>
			</dialog>

			<dialog ref={modalRef} className="rounded-xl p-0 w-[480px] shadow-xl backdrop:bg-black/50">
			{/* Header */}
			<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
			<h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">Share invite link</h2>
			<button
				onClick={() => modalRef.current?.close()}
				className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-[#9ca3af] text-xs cursor-pointer flex items-center justify-center hover:border-red-400 hover:text-red-400 transition"
			>
				✕
			</button>
			</div>

			{/* Body */}
			<div className="px-6 py-5 flex flex-col gap-3">
			<label className="text-sm font-medium text-[#1a1d2e]">Invite link</label>
			<div className="flex gap-2">
				<input
				id="invite-link"
				type="text"
				readOnly
				value={link}
				className="flex-1 border border-[#e4e8f0] rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50 outline-none"
				/>
			</div>
			<p className="text-xs text-gray-400">This link will expire in 3 days.</p>
			</div>

			{/* Footer */}
			<div className="flex justify-end gap-2.5 px-6 py-4 border-t border-gray-100">
			<button
				onClick={() => modalRef.current?.close()}
				className="btn-cancel"
			>
				Cancel
			</button>
			<button onClick={copyLink} className="btn-primary px-5 py-2">
				Copy link
			</button>
			</div>
		</dialog>
		</div>
	</>
	);
}
