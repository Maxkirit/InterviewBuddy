import { useState, useRef, useContext, useEffect} from 'react';
import { AuthContext } from "./AuthProvider";
import { ProfileSchema } from './Profile';

type User = {
    user_id: number;
    auth_id: number;
    firstname: string;
    lastname: string;
    email: string;
    role: 'candidate' | 'recruiter' | 'admin';
    created_at: string;
    country: string | null;
    organization: string | null;
    bio: string | null;
    linkedin_link: string | null;
    phone_number: string | null;
    job_title: string | null;
    gender: string | null;
    date_of_birth: string | null;
    profile_pic_url: string;
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
				setUsers(result?.data);
			} catch(e){
				console.log("error in api/v1/user/all");
			}
		}
		getUser();
	}, [])

	function openEditModal(user?: User){
		setSelectUser(user ?? null);
		console.log(user);
		editModalUser.current?.showModal();
	}

	function openDeleteModal(user: User){
		console.log(user);
		setSelectUser(user);
		deleteModalUser.current?.showModal();
	}

	function updateField(field: keyof User, value: string){
		setSelectUser(prev => prev ? { ...prev, [field]: value } : null);
	}

	async function handleSave(){
		try {
			console.log(selectUser);
            const input = {
                firstname: selectUser?.firstname ?? "",
                lastname: selectUser?.lastname ?? "",
                country: selectUser?.country ?? "",
                organization: selectUser?.organization ?? "",
                bio: selectUser?.bio ?? "",
                linkedin_link: selectUser?.linkedin_link ?? "",
                phone_number: selectUser?.phone_number ?? "",
                job_title: selectUser?.job_title ?? "",
                gender: selectUser?.gender ?? "",
                date_of_birth: selectUser?.date_of_birth ?? "",
            };
            ProfileSchema.parse(input);
            await authContext?.axiosInstance.patch(
                `/api/v1/user/profile/${selectUser?.user_id}`,
                input,
            );
            editModalUser.current?.close();
        } catch (error) {
            console.log("in error path");
            console.log(error);
        }
		try{
			const result = await authContext?.axiosInstance.get("/api/v1/user/all");
			setUsers(result?.data);
		}
		catch(e){
			console.log("failed to reload data");
			console.log(e);
		}
	}

	return(
        <div className="max-w-[900px] mx-auto px-6 py-10">

            {/* Header */}
            <div className="flex items-baseline gap-3 mb-7">
                <h1 className="text-[1.75rem] font-bold text-[#1a1d2e]">Users</h1>
            </div>

            {/* Liste */}
            <div className="flex flex-col gap-3">
                {users.map(user => (
                    <div key={user.user_id} className="bg-white border border-[#e4e8f0] rounded-[14px] px-6 py-5 flex items-center gap-6">

                        {/* Gauche */}
                        <div className="flex items-center gap-3.5 flex-[0_0_240px]">
                            <div className="avatar relative overflow-hidden">
                                {user?.profile_pic_url && (
                                    <img
                                        src={`https://localhost/avatars/${user.profile_pic_url}`}
                                        className="absolute inset-0 w-full h-full object-cover rounded-full"
                                        onError={(e) => e.currentTarget.remove()}
                                    />
                                )}
                                {user ? `${user.firstname[0]}${user.lastname[0]}` : "??"}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="text-[0.95rem] font-semibold text-[#1a1d2e]">{user.firstname} {user.lastname}</div>
                                <div className="text-[0.8rem] text-[#6b7280]">{user.email}</div>
                                <div className="text-[0.75rem] text-[#9ca3af]">
									 Created_at : {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
								</div>
                            </div>
                        </div>
                        {/* Droite */}
                        <div className="flex-1 flex items-center gap-5 justify-end">
                            <span className={`status-badge ${user.role === 'admin' ? 'bg-[#fef3c7] text-[#b45309]' : `status-${user.role}`}`}>
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
                    <div>
                        <h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">
                            {selectUser ? 'Edit user' : 'Add user'}
                        </h2>
                        {selectUser && (
                            <p className="text-[0.85rem] text-[#6b7280] mt-0.5">
                                {selectUser.firstname} {selectUser.lastname}
                            </p>
                        )}
                    </div>
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
				            <label className="form-label">Country</label>
				            <input className="form-input border-[#d1d5db]" type="text"
				                value={selectUser?.country ?? ''}
								onChange={(e) => updateField('country', e.target.value)} />
				        </div>
				        <div className="form-field">
				            <label className="form-label">Job title</label>
				            <input className="form-input border-[#d1d5db]" type="text"
				                value={selectUser?.job_title ?? ''}
								onChange={(e) => updateField('job_title', e.target.value)} />
				        </div>
				    </div>
				    <div className="form-field">
				        <label className="form-label">Organisation</label>
				        <input className="form-input border-[#d1d5db]" type="text"
				            value={selectUser?.organization ?? ''}
							onChange={(e) => updateField('organization', e.target.value)} />
				    </div>
				    <div className="form-field">
				        <label className="form-label">Bio</label>
				        <textarea className="form-input border-[#d1d5db] resize-y min-h-[90px]"
				            value={selectUser?.bio ?? ''}
							onChange={(e) => updateField('bio', e.target.value)} />
				    </div>
				    <div className="form-field">
				        <label className="form-label">LinkedIn</label>
				        <input className="form-input border-[#d1d5db]" type="url"
				            value={selectUser?.linkedin_link ?? ''}
							onChange={(e) => updateField('linkedin_link', e.target.value)} />
				    </div>
				    <div className="form-field">
				        <label className="form-label">Phone</label>
				        <input className="form-input border-[#d1d5db]" type="tel"
				            value={selectUser?.phone_number ?? ''}
							onChange={(e) => updateField('phone_number', e.target.value)} />
				    </div>
				</div>
                <div className="flex justify-end gap-2.5 px-9 py-6">
                    <button className="btn-cancel" onClick={() => editModalUser.current?.close()}>Cancel</button>
                    <button className="btn-primary px-6 py-[9px]" onClick={handleSave}>Save</button>
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