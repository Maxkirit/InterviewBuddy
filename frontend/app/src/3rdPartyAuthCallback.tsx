import { AuthContext, decodeJwt } from "./AuthProvider";
import {useContext, useEffect} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
    const [ searchParams ] = useSearchParams();
    const status = searchParams.get('status');
    const accessToken = searchParams.get('accessToken');
    const authContext = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        try {
            if (!accessToken)
                throw new Error('empty access token');
            const decoded = decodeJwt(accessToken);
                    authContext?.login(
                        accessToken,
                        parseInt(decoded.userId),
                        decoded.role,
                    );
            if (status === 'signup') {
                console.log("in pick role path from authcallback, navigating")
                navigate('/pick-role');
            } else {
                console.log("in profile path from auth callback, navigating");
                navigate('/profile');
            }
        } catch (error) {
            console.error('Auth callback failed:', error);
            navigate('/login', { replace: true, state: { flash: "3rd party authentication failed"} }); 
        }
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Finishing sign in...</p>
        </div>
    );
    
}
