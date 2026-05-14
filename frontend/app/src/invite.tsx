import { useEffect, useRef, useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

export default function InviteLink(){
	const [searchparam]= useSearchParams();
	const token= searchparam.get("token")
	const authContext = useContext(AuthContext);
	const navigate = useNavigate();

	useEffect(()=>{
		async function createConnection(){
			try{
				await authContext?.axiosInstance.post(`api/v1/user/${authContext.userId}/connections/${token}`)
				navigate("/profile")
			}
			catch(e){
				return (
    			<div>
        			<p>Loading...</p>
				</div>
    			);
			}
		}
		createConnection();
	})
	
}