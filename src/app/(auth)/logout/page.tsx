/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from "react";
import { useAuthStore } from "@/utils/auth";
import { useRouter } from "next/navigation"; // ✅ Added Next.js Router

export default function Page() {
    const authStore = useAuthStore();
    const router = useRouter(); // ✅ Initialize router
    const [isLoggingOut, setIsLoggingOut] = useState(false); // ✅ Added to prevent infinite loop

    useEffect(() => {
        if (!authStore.isLoggedIn) {
            router.push("/login"); // ✅ Redirect immediately if already logged out
            return;
        }

        if (!isLoggingOut) { // ✅ Prevent multiple calls
            const handleLogout = async () => {
                setIsLoggingOut(true); // ✅ Set state before calling logout
                await authStore.logout(); // ✅ Ensure logout is completed
                router.push("/login"); // ✅ Redirect after logout
            };

            handleLogout();
        }
    }, [authStore.isLoggedIn, router, isLoggingOut]); // ✅ Added `isLoggingOut` to dependencies

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="bg-white shadow-lg rounded-lg p-6 text-center w-80">
                <h1 className="text-gray-700 text-xl font-semibold">Logging Out...</h1>
                <p className="text-gray-500 text-sm mt-2">Please wait while we securely log you out.</p>

                {/* ✅ Loading Spinner */}
                <div className="mt-4 flex justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500"></div>
                </div>

                <p className="text-gray-400 text-xs mt-4">Redirecting to login...</p>
            </div>
        </div>
    );
}