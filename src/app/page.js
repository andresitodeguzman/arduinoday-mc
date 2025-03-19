"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { auth } from '../utils/firebase';
import Image from "next/image";

export default function HomePage() {
    const router = useRouter();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (loggedInUser) => {
            if (!loggedInUser) {
                router.push("/login"); // Redirect to login if not authenticated
            } else {
                setUser(loggedInUser);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = () => {
        router.push("/logout"); // ✅ Redirect to dedicated logout page
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 px-6">
            <h1 className="text-2xl font-bold mb-6">Welcome to<br />Arduino Day Mission Control</h1>

            {/* Navigation Icons */}
            <div className="grid grid-cols-2 gap-6">
                <div
                    onClick={() => router.push("/verifier")}
                    className="flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-lg cursor-pointer transition-transform transform hover:scale-105"
                >
                    <Image src="/icons/verifier.svg" alt="Verifier" width={64} height={64} />
                    <p className="text-lg font-semibold">Verifier</p>
                </div>

                <div
                    onClick={() => router.push("/registration")}
                    className="flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-lg cursor-pointer transition-transform transform hover:scale-105"
                >
                    <Image src="/icons/registration.svg" alt="Registration" width={64} height={64} />
                    <p className="text-lg font-semibold">Registration</p>
                </div>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="mt-8 bg-red-500 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-red-600 transition"
            >
                Logout
            </button>
            {/* Footer */}
            <footer className="absolute bottom-4 text-gray-500 text-sm">
                Made with ❤️ by ChatGPT and PWA Pilipinas
            </footer>
        </div>
    );
}
