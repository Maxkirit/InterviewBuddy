import { useState, useRef, useContext, useEffect} from 'react';
import { AuthContext } from "./AuthProvider";

type User = {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    role: 'candidate' | 'recruiter';
    joinedAt: string;
};

export default function AdminUsers(){
	const [users, setUsers] = useState<User[]>([]);
	const [selectUser, setSelectUser] = useState<User | null>(null);
	const editModalUser = useRef<HTMLDialogElement>(null);
	const deleteModalUser = useRef<HTMLDialogElement>(null);
	const authContext = useContext(AuthContext);
	
	useEffect(()=>{
		async function getUser(){
		try{
			const result = await authContext?.axiosInstance.get("/api/v1/user/all");
			console.log(result?.data);
			setUsers(result?.data)
		}
		catch(e){
			console.log("error in api/v1/user/all");
		}
	}
	getUser();
	}, [])


	function openEditModal(user?: User){
		setSelectUser(user ?? null);
		editModalUser.current?.showModal;
	}

		function openDeleteModal(user: User){
		setSelectUser(user ?? null);
		deleteModalUser.current?.showModal;
	}
	return(
        <div className="max-w-[900px] mx-auto px-6 py-10">

            {/* Header */}
            <div className="flex items-baseline gap-3 mb-7">
                <h1 className="text-[1.75rem] font-bold text-[#1a1d2e]">Users</h1>
                <button
                    onClick={() => openEditModal()}
                    className="px-5 py-[9px] rounded-lg bg-[#4f6ef7] text-white text-sm font-semibold cursor-pointer hover:bg-[#3d5ce6] transition"
                >
                    + Add user
                </button>
            </div>

            {/* Liste */}
            <div className="flex flex-col gap-3">
                {users.map(user => (
                    <div key={user.id} className="bg-white border border-[#e4e8f0] rounded-[14px] px-6 py-5 flex items-center gap-6">

                        {/* Gauche */}
                        <div className="flex items-center gap-3.5 flex-[0_0_240px]">
                            <div className="avatar">{user.firstname[0]}{user.lastname[0]}</div>
                            <div className="flex flex-col gap-0.5">
                                <div className="text-[0.95rem] font-semibold text-[#1a1d2e]">{user.firstname} {user.lastname}</div>
                                <div className="text-[0.8rem] text-[#6b7280]">{user.email}</div>
                                <div className="text-[0.75rem] text-[#9ca3af]">Joined {user.joinedAt}</div>
                            </div>
                        </div>

                        {/* Droite */}
                        <div className="flex-1 flex items-center gap-5 justify-end">
                            <span className={`status-badge status-${user.role}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                            <button
                                onClick={() => openEditModal(user)}
                                className="px-4 py-[7px] rounded-lg border border-[#4f6ef7] text-[#4f6ef7] text-[0.85rem] font-medium cursor-pointer hover:bg-[#4f6ef7] hover:text-white transition"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => openDeleteModal(user)}
                                className="px-4 py-[7px] rounded-lg border border-[#ef4444] text-[#ef4444] text-[0.85rem] font-medium cursor-pointer hover:bg-[#ef4444] hover:text-white transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Edit / Add */}
            <dialog ref={editModalUser}>
                <div className="flex items-center justify-between px-9 pt-8 mb-6">
                    <h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">
                        {selectUser ? 'Edit user' : 'Add user'}
                    </h2>
                    <button
                        onClick={() => editModalUser.current?.close()}
                        className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-[#9ca3af] text-xs cursor-pointer flex items-center justify-center hover:border-[#ef4444] hover:text-[#ef4444] transition"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex flex-col gap-4 px-9">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-field">
                            <label className="form-label">First name</label>
                            <input className="form-input" type="text" placeholder="First name" defaultValue={selectUser?.firstname ?? ''} />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Last name</label>
                            <input className="form-input" type="text" placeholder="Last name" defaultValue={selectUser?.lastname ?? ''} />
                        </div>
                    </div>
                    <div className="form-field">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" placeholder="user@example.com" defaultValue={selectUser?.email ?? ''} />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Role</label>
                        <select className="form-input" defaultValue={selectUser?.role ?? ''}>
                            <option value="" disabled>Select a role…</option>
                            <option value="candidate">Candidate</option>
                            <option value="recruiter">Recruiter</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2.5 px-9 py-6">
                    <button className="btn-cancel" onClick={() => editModalUser.current?.close()}>Cancel</button>
                    <button className="btn-primary px-6 py-[9px]">Save</button>
                </div>
            </dialog>

            {/* Modal Delete */}
            <dialog ref={deleteModalUser}>
                <div className="flex items-center justify-between px-9 pt-8 mb-6">
                    <h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">Delete user?</h2>
                    <button
                        onClick={() => deleteModalUser.current?.close()}
                        className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-[#9ca3af] text-xs cursor-pointer flex items-center justify-center hover:border-[#ef4444] hover:text-[#ef4444] transition"
                    >
                        ✕
                    </button>
                </div>
                <div className="px-9 text-[0.875rem] text-[#4b5563] leading-relaxed">
                    <p>This will permanently delete <strong>{selectUser?.firstname} {selectUser?.lastname}</strong> and all their data. This action cannot be undone.</p>
                </div>
                <div className="flex justify-end gap-2.5 px-9 py-6">
                    <button className="btn-cancel" onClick={() => deleteModalUser.current?.close()}>Cancel</button>
                    <button className="btn-danger">Delete</button>
                </div>
            </dialog>

        </div>
    );
}