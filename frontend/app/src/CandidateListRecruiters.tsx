import { useEffect, useState, useContext } from "react";
import { AuthContext } from "./AuthProvider";

// const authContext = useContext(AuthContext);

export default function CandidateListRecruiters() {
	const authContext = useContext(AuthContext);
	const [connections, setConnections] = useState([]);

    	useEffect(() => {
			async function getConnections(){
				try {
					const result = await authContext?.axiosInstance.get(
						`/api/v1/user/${authContext.userId}/connections`
					);
					setConnections(result?.data)
					console.log(result?.data);
					
				} catch (error) {	
					console.log("in error path");
					// error banner
				}
			}
			getConnections();
		}, []);
	return (
		<div>
			World hi
		</div>
		);
}
