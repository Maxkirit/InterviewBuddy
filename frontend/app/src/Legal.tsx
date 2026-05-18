import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function LegalPage() {
    const { hash } = useLocation();

    useEffect(() => {
        if (hash) {
            const el = document.querySelector(hash);
            el?.scrollIntoView({ behavior: "smooth" });
        }
    }, [hash]);

    return (
        <div className="max-w-2xl mx-auto px-6 py-10">

            <div className="mb-12">
                <p className="text-sm text-gray-400 mb-1">Last updated: May 2026</p>
                <h1 className="text-2xl font-medium mb-1">Legal</h1>
                <p className="text-gray-500">Terms of Service and Privacy Policy for interview-buddy.io</p>
                <div className="flex gap-6 mt-3">
                    <a href="#terms" className="text-sm text-blue-500 hover:underline">Terms of Service</a>
                    <a href="#privacy" className="text-sm text-blue-500 hover:underline">Privacy Policy</a>
            </div>

            <div>
            <section id="terms">
                <h2 className="text-xl font-medium border-b pb-3 mb-6">Terms of Service</h2>

                    <h3 className="font-medium mb-2">About the platform</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">Interview Buddy is a student project developed at École 42 Lausanne. It is a demonstration platform that allows recruiters and candidates to connect, schedule, and conduct system design interviews. It is not a commercial product.</p>

                    <h3 className="font-medium mb-2">Who can use it</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">This platform is intended for demonstration and educational purposes only. By creating an account, you confirm that you will use it in good faith and not attempt to abuse, disrupt, or exploit the service.</p>

                    <h3 className="font-medium mb-2">Acceptable use</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">You agree not to create fake accounts, impersonate other users, attempt to access accounts or data that are not yours, or use the platform for any unlawful purpose.</p>

                    <h3 className="font-medium mb-2">Account suspension</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">We reserve the right to suspend or delete any account that violates these terms, without prior notice.</p>

                    <h3 className="font-medium mb-2">No guarantees</h3>
                    <p className="text-gray-500 leading-relaxed">The platform is provided as-is, as a student project. We make no guarantees of uptime, data persistence, or fitness for any particular purpose.</p>
            </section>

            <section id="privacy" className="mt-12">
                <h2 className="text-xl font-medium border-b pb-3 mb-6">Privacy Policy</h2>

                    <h3 className="font-medium mb-2">What we collect</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">We collect the information you provide when registering: your name, email address, profile picture, and role (candidate or recruiter). We also store data related to your activity on the platform, including connection requests, interview schedules, and interview submissions.</p>

                    <h3 className="font-medium mb-2">Why we collect it</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">Your data is used solely to operate the platform: to authenticate you, display your profile to connected users, and facilitate interviews.</p>

                    <h3 className="font-medium mb-2">Who can see your data</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">Your profile information is visible to users you have connected with. Platform administrators have full access to all user data, interviews, and connections for moderation purposes.</p>

                    <h3 className="font-medium mb-2">Third parties</h3>
                    <p className="text-gray-500 leading-relaxed mb-6">We do not sell, share, or transfer your personal data to any third party.</p>

                    <h3 className="font-medium mb-2">Data deletion</h3>
                    <p className="text-gray-500 leading-relaxed">To request deletion of your account and associated data, contact us at{" "}
                        <a href="mailto:social.upple@gmail.com" className="text-blue-500 hover:underline">social.upple@gmail.com</a>.
                    </p>
            </section>
            </div>
        </div>
    </div> 
    );
}