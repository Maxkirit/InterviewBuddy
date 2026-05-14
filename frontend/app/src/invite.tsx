import { useEffect, useRef, useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

export default function InviteLink() {
  const [searchParam] = useSearchParams();
  const token = searchParam.get("token");
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState(false);

  async function createConnection() {
    try {
      await authContext?.axiosInstance.post(
        `api/v1/user/${authContext.userId}/connections/${token}`
      );
      navigate("/profile", { replace: true });
    } catch (e) {
      setError(true);
    }
  }

  useEffect(() => {
    modalRef.current?.showModal();
  }, []); // ← tableau vide important !

  return (
    <dialog
      ref={modalRef}
      className="fixed rounded-2xl p-0 w-[420px] shadow-xl backdrop:bg-black/50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">
          {error ? "Connection failed" : "You've been invited!"}
        </h2>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-3xl">
              ✕
            </div>
            <p className="text-sm text-gray-500 text-center">
              This invite may be invalid or expired.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 leading-relaxed">
            You have received an invitation to connect. Would you like to accept or decline?
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-gray-100">
        {error ? (
          <button
            className="btn-primary px-6 py-[9px]"
            onClick={() => navigate("/profile", { replace: true })}
          >
            Back to profile
          </button>
        ) : (
          <>
            <button
              className="btn-cancel"
              onClick={() => navigate("/profile", { replace: true })}
            >
              Decline
            </button>
            <button
              className="btn-primary px-6 py-[9px]"
              onClick={createConnection}
            >
              Accept
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}