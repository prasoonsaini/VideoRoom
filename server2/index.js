const WebSocket = require("ws");
const { spawn } = require("child_process");

const YOUTUBE_STREAM_URL = "rtmp://a.rtmp.youtube.com/live2/90de-dw15-s872-m43b-6d4u";

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
    console.log("WebSocket client connected. Starting FFmpeg...");

    const ffmpeg = spawn("ffmpeg", [
        "-i", "-",  // Take input from stdin (WebSocket)
        "-c:v", "libx264", // Encode video in H.264
        "-preset", "veryfast",
        "-b:v", "3000k",
        "-maxrate", "3000k",
        "-bufsize", "6000k",
        "-pix_fmt", "yuv420p",
        "-g", "50",
        "-r", "30",

        "-c:a", "aac",  // Encode audio in AAC
        "-b:a", "128k", // Audio bitrate
        "-ar", "44100", // Audio sample rate
        "-ac", "2", // Stereo audio

        "-f", "flv",  // Output format for YouTube Live
        "rtmp://a.rtmp.youtube.com/live2/90de-dw15-s872-m43b-6d4u"
    ]);


    ws.on("message", (message) => {
        console.log("Received binary data of size:", message.length);
        ffmpeg.stdin.write(message);
    });

    ws.on("close", () => {
        console.log("WebSocket closed, stopping FFmpeg...");
        ffmpeg.stdin.end();
        ffmpeg.kill();
    });
});

console.log("WebSocket server running on ws://localhost:8080");
