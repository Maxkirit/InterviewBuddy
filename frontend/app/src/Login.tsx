import { useState, useContext, type SubmitEvent } from "react";
import { z, ZodError } from "zod";
import axios from "axios";
import { AuthContext, decodeJwt } from "./AuthProvider";
import { Navigate, Link, useNavigate, useLocation} from "react-router-dom";

export const passwordSchema = z
    .string()
    .min(8, { error: "Password too short", abort: true })
    .max(128, { error: "Password too long", abort: true })
    .refine((password) => /[A-Z]/.test(password), {
        error: "Missing at least 1 uppercase letter",
        abort: true,
    })
    .refine((password) => /[a-z]/.test(password), {
        error: "Missing at least 1 lowercase letter",
        abort: true,
    })
    .refine(
        (password) => /[!@#$%^&*()+\-=[\]{};':"\\|,.<>/?~`]/.test(password),
        { error: "Missing at least 1 special character", abort: true },
    );

const LoginSchema = z.object({
    email: z.email(),
    password: passwordSchema,
});

export default function Login() {
    const location= useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>(location.state?.flash ? {form: location.state?.flash} : {});
    const authContext = useContext(AuthContext);
    const navigate = useNavigate();
	const from = location.state?.from ? location.state.from.pathname + (location.state.from.search ?? "") : null;

    if (authContext?.isLoading === true) {
        return (
            <div>
                <p>Loading...</p>
            </div>
        );
    }

    if (authContext?.accessToken != null) {
        console.log("Already have an access token");
        return <Navigate to="/" replace />;
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        setFieldErrors({});
        try {
            const input = { email, password };
            LoginSchema.parse(input);
            const result = await axios.post(
                "/api/v1/auth/login",
                {
                    email: email,
                    password: password,
                },
            );
            const decoded = decodeJwt(result.data.accessToken);
            authContext?.login(
                result.data.accessToken,
                parseInt(decoded.userId),
                decoded.role,
            );
            navigate(from || "/", {replace: true});
        } catch (error) {
            if (error instanceof ZodError) {
                const errs: Record<string, string> = {};
                error.issues.forEach((issue) => {
                    if (issue.path[0]) errs[issue.path[0] as string] = issue.message;
                });
                setFieldErrors(errs);
            } else if (axios.isAxiosError(error) && error.response?.status == 401 && error.response.data.error == "3rd party sign necessary") {
                setFieldErrors({ form: "Try signing in with Google" });
            }else if (axios.isAxiosError(error) && error.response?.status == 401) {
                setFieldErrors({ form: "Invalid email or password" });
            } else {
                setFieldErrors({ form: "Something went wrong. Please try again" });
            }
        }
    }

    function continueGoogle() {
        window.location.href = "/api/v1/auth/google/init";
        //new component mounted when final 202 returned
        //mount in router
        //check invite.tsx for pop up 
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="bg-white border border-[#e4e8f0] rounded-2xl py-10 px-11 w-full max-w-[420px]">
                <span className="text-[1.4rem] font-bold text-[#4f6ef7] tracking-[-0.3px] mb-7 block cursor-default">
                    Interview<span className="text-[#1a1d2e]">Buddy</span>
                </span>

                <h1 className="text-[1.4rem] font-bold text-[#1a1d2e] mb-1.5">
                    Welcome back
                </h1>
                <p className="text-sm text-gray-500 mb-7">
                    Log in to your account to continue.
                </p>
                <form onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label htmlFor="email" className="form-label">
                            Email
                        </label>
                        <input
                            className={`form-input ${fieldErrors.email ? "border-[#ef4444] focus:border-[#ef4444]" : ""}`}
                            type="email"
                            id="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        {fieldErrors.email && <span className="text-xs text-[#ef4444] mt-0.5">{fieldErrors.email}</span>}
                    </div>

                    <div className="form-field">
                        <label htmlFor="password" className="form-label">
                            Password
                        </label>
                        <input
                            className={`form-input ${fieldErrors.password ? "border-[#ef4444] focus:border-[#ef4444]" : ""}`}
                            type="password"
                            id="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {fieldErrors.password && <span className="text-xs text-[#ef4444] mt-0.5">{fieldErrors.password}</span>}
                    </div>

                    {fieldErrors.form && <p className="text-xs text-[#ef4444] mb-2">{fieldErrors.form}</p>}
                    <button
                        className="btn-primary w-full py-[11px] mt-2"
                        type="submit"
                    >
                        Log in
                    </button>
                </form>

                <div className="flex items-center gap-3 my-5 text-[#d1d5db] text-[0.8rem]">
                    <span className="flex-1 h-px bg-[#e4e8f0]" />
                    or
                    <span className="flex-1 h-px bg-[#e4e8f0]" />
                </div>

                <button className="w-full py-[10px] rounded-[10px] border border-[#e4e8f0] bg-white text-[#374151] text-[0.9rem] font-medium cursor-pointer flex items-center justify-center gap-2.5 hover:bg-gray-50 hover:border-gray-300 transition"
                        onClick={continueGoogle}>
                    <svg
                        className="w-[18px] h-[18px] shrink-0"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Continue with Google
                </button>

                <p className="text-center mt-6 text-[0.825rem] text-gray-500">
                    Don't have an account?{" "}
                    <Link
                        to="/register"
                        state={{ from: location.state?.from }}
                        className="text-[#4f6ef7] no-underline font-medium hover:underline"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
