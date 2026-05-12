import { useEffect, useState, useContext } from "react";
import { AuthContext } from "./AuthProvider";
import "./styles/Candidates.css";

type ConnectionData = {
	user_id: number;
	firstname: string;
	lastname: string;
	organization: string;
	profile_pic_url: string | null;
}

export default function CandidateListRecruiters() {
	const authContext = useContext(AuthContext);
	const [connections, setConnections] = useState<ConnectionData[]>([]);

	useEffect(() => {
		async function getConnections() {
			try {
				const result = await authContext?.axiosInstance.get(
					`/api/v1/user/${authContext.userId}/connections`
				);
				const parsed = (result?.data).map((item) => ({
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
				Recruiters
			</h1>
			<div className="candidates-list" style={{ padding: "24px" }}>
				{connections.length === 0 ? (
					<p>No connections yet</p>
				) : (
					connections.map((conn) => (
						<div className="candidate-row" key={conn.user_id}>
							<div className="candidate-row-left">
								<div className="flex flex-col gap-0.5">
									<span className="candidate-name">
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
