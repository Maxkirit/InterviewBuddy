import { useEffect, useState, useContext } from "react";
import { AuthContext } from "./AuthProvider";

type ConnectionData = {
	user_id: number;
	firstname: string;
	lastname: string;
	organization: string;
	profile_pic_url: string;
}

export default function RecruiterListCandidates() {
	const authContext = useContext(AuthContext);
	const [connections, setConnections] = useState<ConnectionData[]>([]);

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

	return (
		<div className="max-w-[900px] mx-auto py-10 px-6">
			<h1 className="text-[1.75rem] font-bold text-[#1a1d2e] mb-7">
				Candidates
			</h1>
			<div className="flex flex-col gap-2">
				{connections.length === 0 ? (
					<p>No connections yet</p>
				) : (
					connections.map((conn) => (
						<div key={conn.user_id} className="bg-white border border-[#e4e8f0] rounded-[12px] px-5 py-3.5 flex items-center justify-between">
							<div className="flex items-center gap-3">
								{/* checks for picture url, if none, puts letters as avatar */}
								{/* {conn.profile_pic_url ? (
									<img
										src={conn.profile_pic_url}
										alt={`${conn.firstname} ${conn.lastname}`}
										className="avatar"
									/>
								) : (
									<div className="avatar">
										{conn.firstname[0]}{conn.lastname[0]}
									</div>
								)} */}
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
						</div>
					))
				)}
			</div>
		</div>
	);
}
