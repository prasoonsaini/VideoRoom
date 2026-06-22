"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ScheduleMeeting() {
    const router = useRouter();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative w-full max-w-sm rounded-2xl border border-[#2A2747] bg-[#14112A] p-6 shadow-2xl"
            >
                <h2
                    className="mb-1 text-center text-xl font-semibold text-[#F5F3FF]"
                    style={{ fontFamily: "var(--font-display)" }}
                >
                    Schedule a meeting
                </h2>
                <p className="mb-5 text-center text-sm text-[#9A94BD]">
                    Set a time and we'll hold the room for you.
                </p>

                <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-[#9A94BD]">
                        Meeting title
                    </label>
                    <input
                        type="text"
                        className="w-full rounded-lg border border-[#2A2747] bg-[#0E0B1F] p-3 text-sm text-[#F5F3FF] placeholder-[#6E6890] outline-none transition focus:border-[#7C3AED]/60 focus:ring-1 focus:ring-[#7C3AED]/40"
                        placeholder="e.g. design review"
                    />
                </div>

                <div className="mb-5">
                    <label className="mb-1.5 block text-xs font-medium text-[#9A94BD]">
                        Date &amp; time
                    </label>
                    <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-[#2A2747] bg-[#0E0B1F] p-3 text-sm text-[#F5F3FF] outline-none transition [color-scheme:dark] focus:border-[#7C3AED]/60 focus:ring-1 focus:ring-[#7C3AED]/40"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => router.push("/", { scroll: false })}
                        className="w-1/2 rounded-lg border border-[#2A2747] px-4 py-2.5 text-sm font-medium text-[#A39FC9] transition hover:bg-[#1C1838]"
                    >
                        Cancel
                    </button>
                    <button
                        className="w-1/2 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#0E0B1F] transition hover:scale-[1.02]"
                        style={{ background: "linear-gradient(135deg, #A78BFA, #06B6D4)" }}
                    >
                        Schedule
                    </button>
                </div>
            </motion.div>
        </div>
    );
}