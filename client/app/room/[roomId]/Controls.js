import { Video, VideoOff, Mic, MicOff, Monitor, Plus } from "lucide-react";

const Controls = ({ isVideo, videoToggle, isMuted, handleToggleMute, handleScreenShare, handleFileUpload }) => {
    return (
        <div className="flex items-center justify-center gap-3">
            <button
                onClick={videoToggle}
                aria-label={isVideo ? "Turn camera off" : "Turn camera on"}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${isVideo
                        ? "border-[#2A2747] bg-[#1C1838] text-[#F5F3FF] hover:bg-[#241F45]"
                        : "border-transparent bg-[#E24B4A] text-white hover:bg-[#C73C3B]"
                    }`}
            >
                {isVideo ? <Video size={19} /> : <VideoOff size={19} />}
            </button>

            <button
                onClick={handleToggleMute}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${!isMuted
                        ? "border-[#2A2747] bg-[#1C1838] text-[#F5F3FF] hover:bg-[#241F45]"
                        : "border-transparent bg-[#E24B4A] text-white hover:bg-[#C73C3B]"
                    }`}
            >
                {isMuted ? <MicOff size={19} /> : <Mic size={19} />}
            </button>

            <button
                onClick={handleScreenShare}
                aria-label="Share screen"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2A2747] bg-[#1C1838] text-[#F5F3FF] transition hover:bg-[#241F45]"
            >
                <Monitor size={19} />
            </button>

            <input
                type="file"
                id="fileInput"
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*, video/*, .pdf, .doc, .docx"
            />
            <button
                onClick={() => document.getElementById("fileInput").click()}
                aria-label="Attach file"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#0E0B1F] transition hover:scale-105"
                style={{ background: "linear-gradient(135deg, #A78BFA, #06B6D4)" }}
            >
                <Plus size={19} />
            </button>
        </div>
    );
};

export default Controls;