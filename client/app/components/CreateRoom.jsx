"use client";

import { useRouter } from "next/navigation";
import { motion, useScroll } from "framer-motion";
import { useState } from "react";
import Link from "next/link";

export default function CreateRoom() {
    const router = useRouter();
    const [roomId, setRoomId] = useState(null)
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-white p-6 rounded-2xl shadow-lg w-96 relative"
            >
                {/* <button
                    onClick={() => router.push("/", { scroll: false })}
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-xl"
                >
                    ✖
                </button> */}
                <h2 className="text-xl font-semibold text-center mb-4">Create Room</h2>

                <div className="mb-4">
                    <label className="block text-sm text-gray-500 mb-1">Room Name (Optional)</label>
                    <textarea
                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                        placeholder="Enter room name..."
                        rows="1"
                        onChange={(e) => {
                            setRoomId(e.target.value)
                        }}
                    ></textarea>
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
                        onClick={() => router.push(`/room/${roomId}`)}
                    >
                        Create
                    </button>

                </div>
            </motion.div>
        </div>
    );
}
