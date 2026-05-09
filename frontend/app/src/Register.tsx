import { useState, useContext, type SubmitEvent } from 'react';
import { AuthContext, decodeJwt } from './AuthProvider';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { z, ZodError } from 'zod';
import axios from 'axios';
// import { passwordSchema } from './Login';

const RegisterSchema = z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.email(),
    // password: passwordSchema,
    role_type: z.literal(["candidate", "recruiter"]),
});

export default function Register() {
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [selectedRole, setSelectedRole] = useState("candidate");
    const authContext = useContext(AuthContext);
    const navigate = useNavigate();

    if (authContext?.isLoading === true) {
        return (
            <div><p>Loading...</p></div>
        );
    }

    if (authContext?.accessToken != null) {
        return <Navigate to="/" replace />;
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        try {
            const input = {
                first_name: firstname,
                last_name: lastname,
                email: email,
                password: password,
                role_type: selectedRole as "candidate" | "recruiter",
            }
            RegisterSchema.parse(input);
            const result = await axios.post('http://localhost:3000/api/v1/auth/register', {
                name: firstname,
                surname: lastname,
                email: email,
                password: password,
                role_type: selectedRole,
            });
            const decoded = decodeJwt(result.data.accessToken);
            authContext?.login(result.data.accessToken, parseInt(decoded.userId), decoded.role);
            navigate("/");
        } catch (error) {
            if (error instanceof ZodError) {
                // error banner
            } else {
                // add try again banner to form
            }
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="bg-white border border-[#e4e8f0] rounded-2xl py-10 px-11 w-full max-w-[420px]">
                <span className="text-[1.4rem] font-bold text-[#4f6ef7] tracking-[-0.3px] mb-7 block cursor-default">
                    Interview<span className="text-[#1a1d2e]">Buddy</span>
                </span>

                <h1 className="text-[1.4rem] font-bold text-[#1a1d2e] mb-1.5">Create an account</h1>
                <p className="text-sm text-gray-500 mb-7">Who are you joining as?</p>

                <form onSubmit={handleSubmit}>
                    {/* Role picker */}
                    <div className="flex gap-2.5 mb-6">
                        <label className="flex-1 border-2 border-[#e4e8f0] rounded-xl p-4 text-center cursor-pointer transition has-[:checked]:border-[#4f6ef7] has-[:checked]:bg-[#f0f3ff]">
                            <input type="radio" name="role" value="candidate" className="hidden"
                            checked={selectedRole === "candidate"} onChange={(e) => setSelectedRole(e.target.value)} />
                            <div className="text-2xl mb-1.5">&#128101;</div>
                            <span className="block text-sm font-semibold text-[#1a1d2e]">Candidate</span>
                            <span className="block text-xs text-gray-500 mt-0.5">I'm looking for a job</span>
                        </label>
                        <label className="flex-1 border-2 border-[#e4e8f0] rounded-xl p-4 text-center cursor-pointer transition has-[:checked]:border-[#4f6ef7] has-[:checked]:bg-[#f0f3ff]">
                            <input type="radio" name="role" value="recruiter" className="hidden"
                            checked={selectedRole === "recruiter"} onChange={(e) => setSelectedRole(e.target.value)} />
                            <div className="text-2xl mb-1.5">&#128188;</div>
                            <span className="block text-sm font-semibold text-[#1a1d2e]">Recruiter</span>
                            <span className="block text-xs text-gray-500 mt-0.5">I'm hiring</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-field">
                            <label htmlFor="firstname" className="form-label">First name</label>
                            <input className="form-input" type="text" id="firstname" placeholder="Jane" value={firstname}
                            onChange={(e) => setFirstname(e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label htmlFor="lastname" className="form-label">Last name</label>
                            <input className="form-input" type="text" id="lastname" placeholder="Smith" value={lastname}
                            onChange={(e) => setLastname(e.target.value)} />
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input className="form-input" type="email" id="email" placeholder="you@example.com" value={email}
                            onChange={(e) => setEmail(e.target.value)} />
                    </div>

                    <div className="form-field">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input className="form-input" type="password" id="password" placeholder="••••••••" value={password}
                            onChange={(e) => setPassword(e.target.value)} />
                    </div>

                    <button className="btn-primary w-full py-[11px] mt-2" type='submit'>
                        Create account
                    </button>
                </form>

                <p className="text-center mt-6 text-[0.825rem] text-gray-500">
                    Already have an account?{" "}
                    <Link to="/login" className="text-[#4f6ef7] no-underline font-medium hover:underline">Log in</Link>
                </p>
            </div>
        </div>
    );
}
