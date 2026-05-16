import { useEffect, useState, useContext, type SubmitEvent, useRef } from "react";
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
    const [firstname, setFirstname] = useState<string>("");
    const [lastname, setLastname] = useState<string>("");
    const [country, setCountry] = useState<string>("");
    const [organisation, setOrganisation] = useState<string>("");
    const [bio, setBio] = useState<string>("");
    const [linkedin, setLinkedin] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [jobTitle, setJobTitle] = useState<string>("");
    const [gender, setGender] = useState<string>("");
    const [dob, setDob] = useState<string>("");
    const [profilePic, setProfilePic] = useState<string>("");
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const ref = useRef<HTMLDialogElement>(null);
    

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
                setProfilePic(userInfo?.data.profile_pic_url ?? "");
            } catch (error) {
                // display error banner
                console.log(`in error path: ${error}`);
            }
        }

        getUserInfo();
    }, []);

    async function handleLogoutEverywhere() {
        try {
            await authContext?.axiosInstance.get('/api/v1/auth/logout/everywhere');
            authContext?.logout();
        } catch (error) {
            console.log(`in error path: ${error}`);
        }
    }

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

    useEffect(() => {
        if (isOpen) {
            ref.current?.showModal();
        } else {
            ref.current?.close();
        }
    }, [isOpen]);

    function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
        if (e.target === ref.current) closeDialog();
    }

    function closeDialog() {
        setIsOpen(false);
        setSelectedFile(null);
        setPreviewUrl(null);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setSelectedFile(file);
        setPreviewUrl(file ? URL.createObjectURL(file) : null);
    }

    async function handlePicSubmit(e: SubmitEvent) {
        e.preventDefault();
        if (!selectedFile) return;
        try {
            await authContext?.axiosInstance.post(
                `/api/v1/user/avatar/${authContext?.userId}`,
                selectedFile,
                { headers: { "Content-Type": selectedFile.type } },
            );
            const res = await authContext?.axiosInstance.get(`/api/v1/user/avatar/${authContext?.userId}`);
            setProfilePic(res?.data.profile_pic_url ?? "");
            closeDialog();
        } catch (error) {
            console.log(`in error path ${error}`);
            // error banner
        }
    }

    
    // async function handlePicSubmit(e: SubmitEvent) {
    //     e.preventDefault();
    //     if (!selectedFile) return;

    //     try {
    //         const formData = new FormData();
    //         formData.append("avatar", selectedFile);

    //         await authContext?.axiosInstance.post(
    //             `/api/v1/user/avatar/${authContext?.userId}`,
    //             formData,
    //         );

    //         const res = await authContext?.axiosInstance.get(
    //             `/api/v1/user/avatar/${authContext?.userId}`,
    //         );

    //         setProfilePic(res?.data.profile_pic_url ?? "");
    //         closeDialog();
    //     } catch (error) {
    //         console.log(`in error path ${error}`);
    //         // error banner
    //     }
    // }

    return (
        <>
            <div className="max-w-[720px] mx-auto py-10 px-6">
                <div className="grid grid-cols-[220px_1fr] gap-10 items-start">
                    {/* Left column */}
                    <div className="flex flex-col items-center gap-5">
                        <div className="relative w-[100px] h-[100px]">
                            <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] flex items-center justify-center text-white text-[2rem] font-bold overflow-hidden">
                                {profilePic && (
                                    <img
                                        src={`/avatars/${profilePic}`}
                                        className="absolute inset-0 w-full h-full object-cover rounded-full"
                                        onError={(e) => e.currentTarget.remove()}
                                    />
                                )}
                                {(firstname && lastname) ? `${firstname[0]}${lastname[0]}` : "??"}
                            </div>
                            <button
                                className="absolute bottom-0.5 right-0.5 w-[26px] h-[26px] rounded-full bg-white border border-[#e4e8f0] flex items-center justify-center text-[0.7rem] cursor-pointer text-gray-500 hover:border-[#4f6ef7] hover:text-[#4f6ef7] transition"
                                title="Change photo"
                                onClick={() => setIsOpen(true)}
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
                            <div className="flex justify-between items-center mt-1">
                                <button
                                    type="button"
                                    onClick={handleLogoutEverywhere}
                                    className="px-4 py-[10px] rounded-lg border border-[#ef4444] text-[#ef4444] text-sm font-medium cursor-pointer hover:bg-[#ef4444] hover:text-white transition"
                                >
                                    Logout everywhere
                                </button>
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

            <dialog ref={ref} onClick={handleBackdropClick}>
                <div className="p-8 px-9" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[1.1rem] font-bold text-[#1a1d2e]">Change profile picture</h2>
                        <button
                            type="button"
                            className="w-[30px] h-[30px] rounded-lg border border-[#e4e8f0] bg-white text-gray-400 text-xs cursor-pointer flex items-center justify-center transition hover:border-[#ef4444] hover:text-[#ef4444]"
                            onClick={closeDialog}
                        >
                            &#10005;
                        </button>
                    </div>
                    <form onSubmit={handlePicSubmit}>
                        <div className="flex flex-col items-center gap-4 mb-6">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] overflow-hidden flex items-center justify-center text-white text-2xl font-bold">
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <>{firstname[0]}{lastname[0]}</>
                                )}
                            </div>
                            <label className="cursor-pointer px-4 py-2 rounded-lg border border-[#e4e8f0] text-[0.875rem] font-medium text-[#4b5563] hover:border-[#4f6ef7] hover:text-[#4f6ef7] transition">
                                {selectedFile ? selectedFile.name : "Choose a file…"}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </label>
                            <p className="text-[0.775rem] text-[#b0b7c3]">JPEG or PNG · max 5 MB</p>
                        </div>
                        <div className="flex justify-end gap-2.5">
                            <button type="button" className="btn-cancel" onClick={closeDialog}>Cancel</button>
                            <button
                                type="submit"
                                className="btn-primary px-6 py-[9px]"
                                disabled={!selectedFile}
                            >
                                Upload
                            </button>
                        </div>
                    </form>
                </div>
            </dialog>
        </>
    );
}
