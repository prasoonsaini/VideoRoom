"use client";
import { getAuthStatus, getLoginUrl } from "@/utils/googleAuth";
import { useRouter } from "next/navigation";
import AuthButtons from "./authButton";

export default function Header() {
    const router = useRouter();

    return (
        <header className="flex items-center justify-between px-6 py-3 bg-white ">
            {/* Left Section - Logo */}
            <div className="text-xl font-semibold text-blue-600 cursor-pointer" onClick={() => router.push("/")}>
                🎥 stream-yt
            </div>

            {/* Right Section - Navigation */}
            <div className="flex items-center space-x-6">
                {/* Recordings Link */}
                <button
                    className="text-gray-600 hover:text-blue-500 transition"
                    onClick={() => router.push("/recordings")}
                >
                    Recordings
                </button>

                {/* Login Button */}

                <AuthButtons />

                {/* Signup Button */}
                {/* <button
                    className="px-4 py-1 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition"
                    onClick={() => router.push("/signup")}
                >
                    Sign Up
                </button> */}
            </div>
        </header>
    );
}
