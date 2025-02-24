"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ScheduleMeeting() {
    const router = useRouter();

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-white p-6 rounded-2xl shadow-lg w-96 relative"
            >
                <h2 className="text-xl font-semibold text-center mb-4">Schedule Meeting</h2>

                <div className="mb-4">
                    <label className="block text-sm text-gray-500 mb-1">Meeting Title</label>
                    <input
                        type="text"
                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Enter meeting title..."
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-gray-500 mb-1">Date & Time</label>
                    <input
                        type="datetime-local"
                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>

                <div className="flex justify-between space-x-4 mt-4">
                    <button
                        onClick={() => router.push("/", { scroll: false })}
                        className="w-1/2 px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                        Cancel
                    </button>
                    <button
                        className="w-1/2 px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition"
                    >
                        Schedule
                    </button>
                </div>
            </motion.div>
        </div>
    );
}