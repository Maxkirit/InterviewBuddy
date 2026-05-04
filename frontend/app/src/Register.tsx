import './styles/Auth.css';
import { useState, useContext, type SubmitEvent } from 'react';
import { AuthContext } from './AuthProvider';
import { Navigate, Link } from 'react-router-dom';
import { z, ZodError } from 'zod';
import axios from 'axios';

export default function Register() {
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [selectedRole, setSelectedRole] = useState("candidate");
    const authContext = useContext(AuthContext);

    const Register = z.object({
        first_name: z.string().min(1),
        last_name: z.string().min(1),
        email: z.email(),
        password: z.string().min(1),
        role_type: z.literal(["candidate", "recruiter"]),
    });

    if (authContext?.accessToken != null) {
        return <Navigate to="/" />;
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
            Register.parse(input);
            const result = await axios.post('http://localhost:3000/api/v1/auth/register', {
                first_name: firstname,
                last_name: lastname,
                email: email,
                password: password,
                role_type: selectedRole,
            });
            authContext?.login(result.data.access_token);
        } catch (error) {
            if (error instanceof ZodError) {
                // error banner
            } else {
                // add try again banner to form
            }
        }
    }


    return (
        <div className="auth-page">
            <div className="auth-card">
                <span className="auth-logo">Interview<span>Buddy</span></span>

                <h1>Create an account</h1>
                <p className="auth-subtitle">Who are you joining as?</p>

                {/* Role picker */}
                <form onSubmit={handleSubmit}>
                    <div className="role-picker">
                        <label className="role-option">
                            <input type="radio" name="role" value="candidate" 
                            checked={selectedRole === "candidate"} onChange={(e) => setSelectedRole(e.target.value)} />
                            <div className="role-icon">&#128101;</div>
                            <span className="role-label">Candidate</span>
                            <span className="role-desc">I'm looking for a job</span>
                        </label>
                        <label className="role-option">
                            <input type="radio" name="role" value="recruiter" 
                            checked={selectedRole === "recruiter"} onChange={(e) => setSelectedRole(e.target.value)} />
                            <div className="role-icon">&#128188;</div>
                            <span className="role-label">Recruiter</span>
                            <span className="role-desc">I'm hiring</span>
                        </label>
                    </div>

                    <div className="profile-row">
                        <div className="form-group">
                            <label htmlFor="firstname">First name</label>
                            <input type="text" id="firstname" placeholder="Jane" value={firstname}
                            onChange={(e) => setFirstname(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lastname">Last name</label>
                            <input type="text" id="lastname" placeholder="Smith" value={lastname}
                            onChange={(e) => setLastname(e.target.value)} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" placeholder="you@example.com" value={email}
                            onChange={(e) => setEmail(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" placeholder="••••••••" value={password}
                            onChange={(e) => setPassword(e.target.value)} />
                    </div>

                    <button className="btn-primary" type='submit'>Create account</button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}