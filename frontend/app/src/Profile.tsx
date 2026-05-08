import './styles/Profile.css';
import { useEffect, useState, useContext, type SubmitEvent } from 'react';
import { AuthContext } from './AuthProvider';

export default function MyProfile() {
    const [firstname, setFirstname] = useState<string>();
    const [lastname, setLastname] = useState<string>();
    const [country, setCountry] = useState<string>();
    const [organisation, setOrganisation] = useState<string>();
    const [bio, setBio] = useState<string>();
    const [linkedin, setLinkedin] = useState<string>();
    const [phone, setPhone] = useState<string>();
    const [jobTitle, setJobTitle] = useState<string>();
    const [gender, setGender] = useState<string>();
    const [dob, setDob] = useState<string>();

    const authContext = useContext(AuthContext);

    useEffect(() => {
        async function getUserInfo() {
            try {
                const userInfo = await authContext.axiosInstance.get(`http://localhost:3000/api/v1/user/${authContext.userId}`);
                setFirstname(userInfo.data.firstname);
                setLastname(userInfo.data.lastname);
                setCountry(userInfo.data.country);
                setOrganisation(userInfo.data.organization);
                setBio(userInfo.data.bio);
                setLinkedin(userInfo.data.linkedin_link);
                setPhone(userInfo.data.phone_number);
                setJobTitle(userInfo.data.job_title);
                setGender(userInfo.data.gender);
                setDob(userInfo.data.date_of_birth);
            } catch (error) {
                // display error banner
            }
        }

        getUserInfo();
    }, []);

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        try {
            await authContext.axiosInstance.patch('http://localhost:3000/api/v1/user/profile', {
                firstname: firstname ?? "",
                lastname: lastname ?? "",
                country: country ?? "",
                organization: organisation ?? "",
                bio: bio ?? "",
                linkedin_link: linkedin ?? "",
                phone_number: phone ?? "",
                job_title: jobTitle ?? "",
                gender: gender ?? "",
                date_of_birth: dob ?? "",
            })
        } catch (error) {
            // display error banner
        }
    }

    return (
        <div className="page">
            <div className="profile-layout">
                {/* <!-- Left column --> */}
                <div className="profile-left">
                    <div className="profile-avatar-wrap">
                        <div className="profile-avatar">TN</div>
                        <button
                            className="profile-avatar-edit"
                            title="Change photo"
                        >
                            &#9998;
                        </button>
                    </div>
                    <div className="profile-identity">
                        <div className="name">{firstname} {lastname}</div>
                        <div className="meta">{jobTitle}</div>
                        <div className="meta">{country}</div>
                    </div>
                </div>

                {/* <!-- Right column --> */}
                <div className="profile-right">
                    <form onSubmit={handleSubmit}>
                        <h1 className="profile-page-title">Profile</h1>
                        <div className="profile-row">
                            <div className="form-group">
                                <label htmlFor="gender">Gender</label>
                                <select
                                id="gender"
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="profile-select"
                                >
                                    <option value="">Select…</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="non_binary">Non-binary</option>
                                    <option value="other">Other</option>
                                    <option value="prefer_not">Prefer not to say</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="dob">Date of birth</label>
                                <input
                                    type="date"
                                    id="dob"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    max={new Date().toISOString().split("T")[0]}
                                />
                            </div>
                        </div>
                        <div className="profile-row">
                            <div className="form-group">
                                <label htmlFor="country">Country</label>
                                <input type="text" id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    placeholder="+1 555 000 0000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="profile-row">
                            <div className="form-group">
                                <label htmlFor="job_title">Job title</label>
                                <input
                                    type="text"
                                    id="job_title"
                                    placeholder="e.g. Software Engineer"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="org">Current organisation</label>
                                <input
                                    type="text"
                                    id="org"
                                    placeholder="e.g. Acme Corp"
                                    value={organisation}
                                    onChange={(e) => setOrganisation(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="bio">Bio</label>
                            <textarea
                                id="bio"
                                placeholder="Tell recruiters a bit about yourself…"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="socials">LinkedIn</label>
                            <input
                                type="url"
                                id="socials"
                                placeholder="https://linkedin.com/in/yourname"
                                value={linkedin}
                                onChange={(e) => setLinkedin(e.target.value)}
                            />
                        </div>
                        <div className="profile-save">
                            <button className="btn-primary" type="submit">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}