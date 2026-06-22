"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { getAuthStatus, getLoginUrl } from '@/utils/googleAuth';
import CreateRoom from "@/app/components/CreateRoom";
import ScheduleMeeting from "./components/ScheduleMeeting";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const FACE_TILES = [
  { top: "8%", left: "6%", size: 64, delay: 0, color: "#7C3AED" },
  { top: "18%", left: "85%", size: 48, delay: 0.6, color: "#06B6D4" },
  { top: "68%", left: "4%", size: 56, delay: 1.2, color: "#FF6B6B" },
  { top: "78%", left: "88%", size: 40, delay: 0.3, color: "#7C3AED" },
  { top: "4%", left: "45%", size: 36, delay: 1.6, color: "#06B6D4" },
  { top: "85%", left: "48%", size: 44, delay: 0.9, color: "#FF6B6B" },
];

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreateRoomOpen = searchParams.get("modal") === "create-room";
  const isScheduleMeetOpen = searchParams.get("modal") === "schedule-meeting";
  const [roomId, setRoomId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await getAuthStatus();
        setIsLoggedIn(!!userData);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  const requireAuth = (action) => {
    if (!isLoggedIn) {
      window.location.href = getLoginUrl();
    } else {
      action();
    }
  };


  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0E0B1F] font-[var(--font-body)]">
      {/* Floating face tiles - signature element */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {FACE_TILES.map((tile, i) => (
          <motion.div
            key={i}
            className="absolute rounded-2xl border"
            style={{
              top: tile.top,
              left: tile.left,
              width: tile.size,
              height: tile.size * 0.75,
              borderColor: `${tile.color}55`,
              background: `${tile.color}14`,
            }}
            animate={{
              y: [0, -14, 0, 14, 0],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: tile.delay,
            }}
          />
        ))}
      </div>

      {/* Ambient gradient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}
      />

      {/* Header */}
      {/* Header */}
      {/* <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }} />
          <span className="text-lg font-semibold tracking-tight text-[#F5F3FF]" style={{ fontFamily: "var(--font-display)" }}>
            videoroom
          </span>
        </div>
        <button className="rounded-full border border-[#7C3AED]/40 px-4 py-1.5 text-sm text-[#F5F3FF] transition hover:border-[#7C3AED] hover:bg-[#7C3AED]/10">
          Sign in
        </button>
      </header> */}

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center px-6 pt-12 text-center md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#06B6D4]/30 bg-[#06B6D4]/10 px-4 py-1.5 text-xs font-medium text-[#7FE3F0]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#06B6D4]" />
          built on webrtc &middot; live in your browser
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-[#F5F3FF] md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Talk face to face,
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #A78BFA, #06B6D4)" }}
          >
            no matter the distance
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.25 }}
          className="mt-6 max-w-md text-base text-[#A39FC9] md:text-lg"
        >
          Start a room in one click. No downloads, no sign-up walls —
          just clear video with everyone who matters.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          className="mt-10 flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row"
        >
          <button
            onClick={() => requireAuth(() => router.push("/?modal=create-room", { scroll: false }))}
            className="w-full rounded-xl px-6 py-3.5 text-sm font-semibold text-[#0E0B1F] transition hover:scale-[1.02] sm:w-auto"
            style={{ background: "linear-gradient(135deg, #A78BFA, #06B6D4)" }}
          >
            Start a meeting
          </button>
          <button
            onClick={() => requireAuth(() => router.push("/?modal=schedule-meeting", { scroll: false }))}
            className="w-full rounded-xl border border-[#3A3658] px-6 py-3.5 text-sm font-semibold text-[#F5F3FF] transition hover:border-[#7C3AED]/60 hover:bg-[#7C3AED]/10 sm:w-auto"
          >
            Schedule for later
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-5 flex w-full max-w-md items-center gap-2 rounded-xl border border-[#2A2747] bg-[#171330]/60 px-4 py-2.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#7C7397]">
            <path d="M9 12L11 14L15 10M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Have a room code? Paste it here"
            className="flex-1 bg-transparent text-sm text-[#F5F3FF] placeholder-[#6E6890] outline-none"
          />
          <button
            onClick={() => requireAuth(() => roomId && router.push(`/room/${roomId}`))}
            className="text-sm font-medium text-[#7FE3F0] hover:text-[#A78BFA]"
          >
            Join &rarr;
          </button>
        </motion.div>
      </main>

      {/* Feature strip */}
      <section className="relative z-10 mx-auto mt-24 grid max-w-4xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-3 md:px-12">
        {[
          { title: "Crystal clear video", desc: "Adaptive streaming keeps every face sharp, even on weak connections.", color: "#7C3AED" },
          { title: "Built for groups", desc: "Bring everyone into one room without your laptop fan taking off.", color: "#06B6D4" },
          { title: "Record & share", desc: "Capture the moment and send it on, no extra software needed.", color: "#FF6B6B" },
        ].map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="rounded-2xl border border-[#2A2747] bg-[#14112A]/70 p-6 text-left"
          >
            <div
              className="mb-4 h-9 w-9 rounded-lg"
              style={{ background: `${f.color}22`, border: `1px solid ${f.color}55` }}
            />
            <h3 className="mb-1.5 text-base font-semibold text-[#F5F3FF]">{f.title}</h3>
            <p className="text-sm leading-relaxed text-[#9A94BD]">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      {isCreateRoomOpen && <CreateRoom />}
      {isScheduleMeetOpen && <ScheduleMeeting />}
    </div>
  );
}