import { useState, useRef } from 'react';
// import './styles/AdminUsers.css';

type User = {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    role: 'candidate' | 'recruiter';
    joinedAt: string;
};

const FAKE_USERS: User[] = [
    { id: 1, firstname: 'Alex', lastname: 'Martinez', email: 'alexmartinez@gmail.com', role: 'candidate', joinedAt: 'Apr 2, 2026' },
    { id: 2, firstname: 'Priya', lastname: 'Lakshmanan', email: 'priya.lakshmanan@gmail.com', role: 'candidate', joinedAt: 'Apr 3, 2026' },
    { id: 3, firstname: 'Sarah', lastname: 'Klein', email: 's.klein@stripe.com', role: 'recruiter', joinedAt: 'Mar 18, 2026' },
];

export default function AdminUsers(){
	const [selectUser, setSelectUser] = useState<User | null>(null);
	const editModalUser = useRef<HTMLDialogElement>(null);
	const deleteModalUser = useRef<HTMLDialogElement>(null);

	function openEditModal(user?: User){
		setSelectUser(user ?? null);
		editModalUser.current?.showModal;
	}

		function openDeleteModal(user: User){
		setSelectUser(user ?? null);
		deleteModalUser.current?.showModal;
	}
	return(
        <div className="page" style={{ maxWidth: '900px' }}>
            <div className="page-header">
                <h1>Users</h1>
                <button className="btn-mock" onClick={() => openEditModal()}>+ Add user</button>
            </div>

            <div className="interview-list">
                {FAKE_USERS.map(user => (
                    <div className="interview-entry" key={user.id}>
                        <div className="interview-entry-left">
                            <div className="avatar">
                                {user.firstname[0]}{user.lastname[0]}
                            </div>
                            <div className="interview-entry-info">
                                <div className="interview-entry-name">{user.firstname} {user.lastname}</div>
                                <div className="interview-entry-pos">{user.email}</div>
                                <div className="interview-entry-question">Joined {user.joinedAt}</div>
                            </div>
                        </div>
                        <div className="interview-entry-right">
                            <span className={`status-badge status-${user.role}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                            <button className="btn-interview" onClick={() => openEditModal(user)}>Edit</button>
                            <button className="btn-delete" onClick={() => openDeleteModal(user)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal edit/add */}
            <dialog ref={editModalUser}>
                <div className="modal-header">
                    <h2>{selectUser ? 'Edit user' : 'Add user'}</h2>
                    <button className="modal-close" onClick={() => editModalUser.current?.close()}>✕</button>
                </div>
                <div className="modal-body">
                    {/* formulaire ici */}
                </div>
                <div className="modal-footer">
                    <button className="btn-cancel" onClick={() => editModalUser.current?.close()}>Cancel</button>
                    <button className="btn-primary btn-primary--compact">Save</button>
                </div>
            </dialog>

            {/* Modal confirm delete */}
            <dialog ref={deleteModalUser}>
                <div className="modal-header">
                    <h2>Delete user?</h2>
                    <button className="modal-close" onClick={() => deleteModalUser.current?.close()}>✕</button>
                </div>
                <div className="modal-body">
                    <p>This will permanently delete {selectUser?.firstname} {selectUser?.lastname}. This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                    <button className="btn-cancel" onClick={() => deleteModalUser.current?.close()}>Cancel</button>
                    <button className="btn-danger">Delete</button>
                </div>
            </dialog>
        </div>
    );
}