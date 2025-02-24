import { Video, VideoOff, Mic, MicOff, Monitor, Plus } from "lucide-react";

const Controls = ({ isVideo, videoToggle, isMuted, handleToggleMute, handleScreenShare, handleFileUpload }) => {
    return (
        <div className="mt-3 flex justify-center gap-2">
            <button
                onClick={videoToggle}
                className={`p-2 rounded-full ${isVideo ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}
            >
                {isVideo ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button
                onClick={handleToggleMute}
                className={`p-2 rounded-full ${isMuted ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
            >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
                onClick={handleScreenShare}
                className="p-2 rounded-full bg-gray-600 text-white"
            >
                <Monitor size={20} />
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
                className="p-2 rounded-full bg-green-500 text-white"
            >
                <Plus size={20} />
            </button>
        </div>
    );
};

export default Controls;
