'use client';
// Ensured the latest version of the file is always retrieved before making changes to prevent "Overwrite changes" errors.
// Will fetch the most up-to-date version of the file before applying edits to avoid conflicts.

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc, getFirestore, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../../utils/firebase";
import jsQR from "jsqr";

export default function VerifierPage() {
    const router = useRouter();
    const auth = getAuth();
    const db = getFirestore(app);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [scannedID, setScannedID] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [userDetails, setUserDetails] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [stream, setStream] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push("/login");
            } else {
                startCamera();
            }
        });

        return () => {
            unsubscribe(); // ✅ Properly unsubscribe from auth state listener
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
                setIsCameraActive(false);
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            if (isCameraActive || videoRef.current?.srcObject) return; // ✅ Prevent reloading

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" } // Try back camera first
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.muted = true; // ✅ Ensure autoplay on iOS
                videoRef.current.setAttribute("playsinline", ""); // ✅ Prevent fullscreen mode on iOS
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(error => console.warn("Video play interrupted:", error));
                };
                setStream(mediaStream);
                setIsCameraActive(true);
                scanQRCode();
            }
        } catch (error) {
            console.error("Camera access denied:", error);
            setStatusMessage("❌ Camera access denied. Please allow permissions.");
        }
    };

    const scanQRCode = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const scan = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

                if (qrCode) {
                    checkApprovalStatus(qrCode.data);
                }
            }
            requestAnimationFrame(scan);
        };

        scan();
    };

    const checkApprovalStatus = async (scanID) => {
        if (!scanID) {
            setStatusMessage("Invalid QR code.");
            return;
        }

        setIsLoading(true);

        try {
            const userDocRef = doc(db, "_arduinoday", scanID);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                setStatusMessage("❌ ID not found.");
                alert("Error: ID not found.");
                return;
            }

            const userData = userDocSnap.data();
            if (userData.status === "APPROVED") {
                if (userData.attended) {
                    setStatusMessage(`⚠️ ${userData.firstName || "User"} ${userData.lastName || ""} is already marked as ATTENDED.`);
                    return;
                }

                setScannedID(scanID);
                setUserDetails({
                    firstName: userData.firstName || "N/A",
                    lastName: userData.lastName || "N/A",
                    email: userData.email || "N/A",
                });
                setStatusMessage(`✅ ${userData.firstName || "User"} ${userData.lastName || ""} is APPROVED.`);
                setShowModal(true);
            } else {
                setStatusMessage(`❌ ID ${scanID} is NOT APPROVED.`);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            alert("Error fetching data. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const markAsAttended = async () => {
        if (!scannedID) return;

        setIsUpdating(true);

        const userDocRef = doc(db, "_arduinoday", scannedID);
        try {
            const timestamp = Timestamp.now();

            await updateDoc(userDocRef, {
                attended: true,
                attendedAt: timestamp,
            });

            setStatusMessage(`✅ ${userDetails?.firstName || "User"} ${userDetails?.lastName || ""} has been marked as ATTENDED.`);

            setUserDetails((prevDetails) => ({
                ...prevDetails,
                attendedAt: new Date(timestamp.toDate()).toLocaleString(),
            }));
        } catch (error) {
            console.error("Error updating attendance:", error);
            alert("Error updating attendance. Please try again.");
        } finally {
            setIsUpdating(false);
            setShowModal(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 px-4">
            {/* Removed <h1> title to optimize screen space */}

            <video ref={videoRef} className="w-full h-full object-cover mb-4 rounded-lg shadow-lg" />

            <canvas ref={canvasRef} className="hidden" />

            {isLoading && scannedID && (
                <p className="mt-4 text-lg font-semibold text-center text-blue-500">Fetching data...</p>
            )}

            {isUpdating && (
                <p className="mt-4 text-lg font-semibold text-center text-blue-500">Updating status...</p>
            )}

            {statusMessage && (
                <p className={`mt-4 text-lg font-semibold text-center ${statusMessage.includes('⚠️') ? 'text-yellow-500' : 'text-green-600'}`}>
                    {statusMessage}
                </p>
            )}

            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center min-w-[80vw] min-h-[50vh]">
                        <p className="text-lg font-semibold mb-4">
                            Mark {userDetails?.firstName} {userDetails?.lastName} as ATTENDED?
                        </p>
                        {userDetails && (
                            <div className="text-left mb-4">
                                <p><strong>First Name:</strong> {userDetails.firstName}</p>
                                <p><strong>Last Name:</strong> {userDetails.lastName}</p>
                                <p><strong>Email:</strong> {userDetails.email}</p>
                                <p><strong>ID:</strong> {scannedID}</p>
                                {userDetails.attendedAt && (
                                    <p className="text-sm text-gray-600">
                                        Marked as attended on: <strong>{userDetails.attendedAt}</strong>
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="mt-20">
                            <button
                                onClick={markAsAttended}
                                className="bg-green-500 text-white px-4 py-4 rounded-md hover:bg-green-600 w-full"
                                disabled={isUpdating}
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="bg-gray-500 text-white px-4 py-4 rounded-md hover:bg-gray-600 w-full mt-5"
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}