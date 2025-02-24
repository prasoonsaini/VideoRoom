"use client";

import { useRouter, useSearchParams } from "next/navigation";
import CreateRoom from "@/app/components/CreateRoom";
import ScheduleMeeting from "./components/ScheduleMeeting";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import VideoCallWithStreaming from "./components/VideoCallWithStreaming";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreateRoomOpen = searchParams.get("modal") === "create-room";
  const isScheduleMeetOpen = searchParams.get("modal") === "schedule-meeting";
  const [roomId, setRoomId] = useState(null);

  return (
    <motion.div
      className="flex flex-col h-screen font-poppins"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="flex flex-col h-full">
        <div className="h-2/3 flex w-4/5 mx-auto">
          {/* Left Section */}
          <motion.div
            className="w-1/2 flex items-center justify-center"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-col w-full space-y-8">
              <div className="h-2/3 flex items-center justify-center">
                <motion.img
                  src="/sampleimg.png"
                  className="w-84 h-64 object-cover"
                  alt="sample"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <div className="h-1/3 flex flex-col items-center space-y-4">
                <div className="w-3/5">
                  <motion.button
                    className="w-full px-6 py-2 font-poppins bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 text-xs"
                    whileHover={{ scale: 1.05 }}
                    onClick={() => router.push("/?modal=create-room", { scroll: false })}
                  >
                    Create Meeting
                  </motion.button>
                </div>
                <div className="w-3/5">
                  <motion.button
                    className="w-full px-6 py-2 font-poppins bg-gray-100 text-black rounded-lg shadow-md hover:bg-gray-300 text-xs"
                    whileHover={{ scale: 1.05 }}
                    onClick={() => router.push("/?modal=schedule-meeting", { scroll: false })}
                  >
                    Schedule Meeting
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Section */}
          <motion.div
            className="w-1/2 flex items-center justify-center "
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-col w-full space-y-8">
              <motion.div
                className="flex h-2/3 flex-col space-y-8 w-1/2 mx-auto"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-4xl font-semibold w-2/5 text-center">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "fit-content" }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="overflow-hidden  whitespace-nowrap"
                  >
                    <h1 className="text-4xl font-semibold text-center leading-tight">
                      Connect <br /> with  anyone,<br /> anywhere
                    </h1>
                  </motion.div>

                </h1>
              </motion.div>
              <div className="h-1/3 w-3/4 mx-auto relative">
                <div className="relative">
                  <motion.textarea
                    className="w-full h-14 pl-4 pr-24 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-md flex items-center"
                    placeholder="Paste link or enter room code..."
                    style={{ lineHeight: "3.5rem", verticalAlign: "middle" }}
                    onChange={(e) => setRoomId(e.target.value)}
                    whileFocus={{ scale: 1.02, boxShadow: "0px 0px 10px rgba(0, 0, 255, 0.5)" }}
                  />
                  <button
                    className="absolute top-1/2 right-2 text-xs transform -translate-y-1/2 
             bg-blue-500 text-white px-4 py-2 rounded-md 
             hover:bg-blue-600 shadow-md flex items-center justify-center transition-all duration-300"
                    onClick={() => router.push(`/room/${roomId}`)}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        <div className="h-1/3 flex w-4/5 mx-auto">
          {/* <LiveStreamIndicator />
          <RecordButton />
          <CountdownTimer />
          <MicVolumeBars /> */}
          {/* <HomepageAnimation /> */}
          {/* <VideoCallGrid /> */}
          <VideoCallWithStreaming />
        </div>
      </div>
      {/* Render Modal Conditionally */}
      {isCreateRoomOpen && <CreateRoom />}
      {isScheduleMeetOpen && <ScheduleMeeting />}
    </motion.div>
  );
}
