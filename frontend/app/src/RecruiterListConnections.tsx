import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "./AuthProvider";
import "./styles/Candidates.css";

type ConnectionData = {
	user_id: number;
	firstname: string;
	lastname: string;
	organization: string;
	profile_pic_url: string | null;
}

export default function RecruiterListCandidates() {
	const authContext = useContext(AuthContext);
	const [connections, setConnections] = useState<ConnectionData[]>([]);
	const modalRef = useRef<HTMLDialogElement>(null);
	const [link, setlink] = useState(null);

	useEffect(() => {
		async function getConnections() {
			try {
				const result = await authContext?.axiosInstance.get(
					`/api/v1/user/${authContext.userId}/connections`
				);
				const parsed = (result?.data.connections).map((item) => ({
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

	async function handleSharelink(){
		try{
			const result = await authContext?.axiosInstance.get(`api/v1/user/link/generate`)
			setlink(result?.data.url);
			console.log(result?.data);
			modalRef.current?.showModal();
		}
		catch(e){
			console.log("can't get share link");
		}
	}

	function copyLink() {
    	const input = document.getElementById("invite-link") as HTMLInputElement;
	    navigator.clipboard.writeText(input.value);
  	}

	return (
		<div className="max-w-[900px] mx-auto py-10 px-6">
			<h1 className="text-[1.75rem] font-bold text-[#1a1d2e] mb-7">
				Candidates
			</h1>
			<div className="flex justify-end mt-1">
                <button
                        className="btn-primary px-7 py-[10px]"
                        type="submit"
						onClick={handleSharelink}
                    >
                        share invite link
                </button>
            </div>
			<div className="candidates-list" style={{ padding: "24px" }}>
				{connections.length === 0 ? (
					<p>No connections yet</p>
				) : (
					connections.map((conn) => (
						<div className="candidate-row" key={conn.user_id}>
							<div className="candidate-row-left">
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
								<div className="avatar">
										{conn.firstname[0]}{conn.lastname[0]}
									</div>
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
              defaultValue={link}
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
	);
}
