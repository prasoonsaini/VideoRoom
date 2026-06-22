"use client";
import { useRouter } from "next/navigation";
import AuthButtons from "./authButton";

export default function Header() {
    const router = useRouter();

    return (
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#2A2747] bg-[#0E0B1F]/90 px-6 py-3 backdrop-blur-md md:px-12">
            {/* Left Section - Logo */}
            <div
                className="flex cursor-pointer items-center gap-2"
                onClick={() => router.push("/")}
            >
                <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}
                />
                <span
                    className="text-lg font-semibold tracking-tight text-[#F5F3FF]"
                    style={{ fontFamily: "var(--font-display)" }}
                >
                    videoroom
                </span>
            </div>

            {/* Right Section - Navigation */}
            <div className="flex items-center gap-5">
                <button
                    className="text-sm text-[#A39FC9] transition hover:text-[#F5F3FF]"
                    onClick={() => router.push("/recordings")}
                >
                    Recordings
                </button>

                <AuthButtons />
            </div>
        </header>
    );
}