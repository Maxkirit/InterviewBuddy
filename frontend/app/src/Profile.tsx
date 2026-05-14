import { useEffect, useState, useContext, type SubmitEvent } from "react";
import { AuthContext } from "./AuthProvider";
import z from "zod";

export const ProfileSchema = z.object({
    firstname: z.string().min(1),
    lastname: z.string().min(1),
    country: z.string().nullable(),
    organization: z.string().nullable(),
    bio: z.string().nullable(),
    linkedin_link: z.union([
        z
            .string()
            .refine((url) => /^https?:\/\/(www\.)?linkedin\.com\//i.test(url), {
                message: "Not a LinkedIn link",
            }),
        z.string().max(0),
    ]),
    phone_number: z.string().nullable(),
    job_title: z.string().nullable(),
    gender: z
        .literal(["male", "female", "non_binary", "prefer_not_to_say", ""])
        .nullable(),
    date_of_birth: z.string().nullable(),
});

const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat" as const,
    backgroundPosition: "right 12px center",
};

export default function MyProfile() {
    const [firstname, setFirstname] = useState<string>();
    const [lastname, setLastname] = useState<string>();
    const [country, setCountry] = useState<string>("");
    const [organisation, setOrganisation] = useState<string>("");
    const [bio, setBio] = useState<string>("");
    const [linkedin, setLinkedin] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [jobTitle, setJobTitle] = useState<string>("");
    const [gender, setGender] = useState<string>("");
    const [dob, setDob] = useState<string>("");

    const authContext = useContext(AuthContext);

    useEffect(() => {
        async function getUserInfo() {
            try {
                const userInfo = await authContext?.axiosInstance.get(
                    `/api/v1/user/${authContext.userId}`,
                );
                setFirstname(userInfo?.data.firstname);
                setLastname(userInfo?.data.lastname);
                setCountry(userInfo?.data.country ?? "");
                setOrganisation(userInfo?.data.organization ?? "");
                setBio(userInfo?.data.bio ?? "");
                setLinkedin(userInfo?.data.linkedin_link ?? "");
                setPhone(userInfo?.data.phone_number ?? "");
                setJobTitle(userInfo?.data.job_title ?? "");
                setGender(userInfo?.data.gender ?? "");
                setDob(userInfo?.data.date_of_birth ?? "");
            } catch (error) {
                // display error banner
                console.log(`in error path: ${error}`);
            }
        }

        getUserInfo();
    }, []);

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        try {
            const input = {
                firstname: firstname ?? "",
                lastname: lastname ?? "",
                country: country ?? "",
                organization: organisation ?? "",
                bio: bio ?? "",
                linkedin_link: linkedin ?? "",
                phone_number: phone ?? "",
                job_title: jobTitle ?? "",
                gender: gender ?? "",
                date_of_birth: dob ? new Date(dob) : "",
            };
            ProfileSchema.parse(input);
            await authContext?.axiosInstance.patch(
                `/api/v1/user/profile/${authContext?.userId}`,
                input,
            );
        } catch (error) {
            console.log("in error path");
            console.log(error);
            // display error banner
        }
    }

    return (
        <div className="max-w-[720px] mx-auto py-10 px-6">
            <div className="grid grid-cols-[220px_1fr] gap-10 items-start">
                {/* Left column */}
                <div className="flex flex-col items-center gap-5">
                    <div className="relative w-[100px] h-[100px]">
                        <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] flex items-center justify-center text-white text-[2rem] font-bold">
                            TN
                        </div>
                        <button
                            className="absolute bottom-0.5 right-0.5 w-[26px] h-[26px] rounded-full bg-white border border-[#e4e8f0] flex items-center justify-center text-[0.7rem] cursor-pointer text-gray-500 hover:border-[#4f6ef7] hover:text-[#4f6ef7] transition"
                            title="Change photo"
                        >
                            &#9998;
                        </button>
                    </div>
                    <div className="text-center">
                        <div className="text-base font-bold text-[#1a1d2e]">
                            {firstname} {lastname}
                        </div>
                        <div className="text-[0.825rem] text-gray-500 mt-[3px]">
                            {jobTitle}
                        </div>
                        <div className="text-[0.825rem] text-gray-500 mt-[3px]">
                            {country}
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-4">
                    <form onSubmit={handleSubmit}>
                        <h1 className="text-[1.75rem] font-bold text-[#1a1d2e] mb-1">
                            Profile
                        </h1>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-field">
                                <label htmlFor="gender" className="form-label">
                                    Gender
                                </label>
                                <select
                                    id="gender"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="form-input appearance-none bg-white cursor-pointer pr-9"
                                    style={selectArrowStyle}
                                >
                                    <option value="">Select…</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="non_binary">
                                        Non-binary
                                    </option>
                                    <option value="prefer_not">
                                        Prefer not to say
                                    </option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label htmlFor="dob" className="form-label">
                                    Date of birth
                                </label>
                                <input
                                    className="form-input"
                                    type="date"
                                    id="dob"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-field">
                                <label htmlFor="country" className="form-label">
                                    Country
                                </label>
                                <input
                                    className="form-input"
                                    type="text"
                                    id="country"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                />
                            </div>
                            <div className="form-field">
                                <label htmlFor="phone" className="form-label">
                                    Phone number
                                </label>
                                <input
                                    className="form-input"
                                    type="tel"
                                    id="phone"
                                    placeholder="+1 555 000 0000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-field">
                                <label
                                    htmlFor="job_title"
                                    className="form-label"
                                >
                                    Job title
                                </label>
                                <input
                                    className="form-input"
                                    type="text"
                                    id="job_title"
                                    placeholder="e.g. Software Engineer"
                                    value={jobTitle}
                                    onChange={(e) =>
                                        setJobTitle(e.target.value)
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label htmlFor="org" className="form-label">
                                    Current organisation
                                </label>
                                <input
                                    className="form-input"
                                    type="text"
                                    id="org"
                                    placeholder="e.g. Acme Corp"
                                    value={organisation}
                                    onChange={(e) =>
                                        setOrganisation(e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="form-field">
                            <label htmlFor="bio" className="form-label">
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                className="form-input resize-y min-h-[90px]"
                                placeholder="Tell recruiters a bit about yourself…"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="socials" className="form-label">
                                LinkedIn
                            </label>
                            <input
                                className="form-input"
                                type="url"
                                id="socials"
                                placeholder="https://linkedin.com/in/yourname"
                                value={linkedin}
                                onChange={(e) => setLinkedin(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end mt-1">
                            <button
                                className="btn-primary px-7 py-[10px]"
                                type="submit"
                            >
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
