import http from 'http';
import express from 'express';
import { spawn } from 'child_process';
import { Server } from 'socket.io';
import fs from 'fs'
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const ffmpegOptions = [
    '-loglevel', 'debug',
    '-f', 'mjpeg',  // Specify format if receiving raw MJPEG stream
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-r', '25',
    '-g', '50',
    '-keyint_min', '25',
    '-crf', '25',
    '-pix_fmt', 'yuv420p',
    '-sc_threshold', '0',
    '-profile:v', 'main',
    '-level', '3.1',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '32000',
    '-movflags', 'frag_keyframe+empty_moov',  // Ensure MP4 writes immediately
    '-f', 'mp4',
    'output.mp4'
];


let ffmpegProcess = spawn('ffmpeg', ffmpegOptions);

ffmpegProcess.stderr.on('data', (data) => {
    console.log(`FFmpeg stderr: ${data.toString().trim()}`);
});


ffmpegProcess.on('error', (err) => {
    console.error('FFmpeg process error:', err);
});

ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg process closed with code ${code}`);
});
function createFFmpegProcess() {
    if (ffmpegProcess) {
        console.log("Restarting FFmpeg process...");
        ffmpegProcess.kill();
    }

    ffmpegProcess = spawn('ffmpeg', ffmpegOptions);

    ffmpegProcess.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data.toString().trim()}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
        console.log(`FFmpeg stderr: ${data.toString().trim()}`);
    });

    ffmpegProcess.on('error', (err) => {
        console.error('FFmpeg process error:', err);
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process closed with code ${code}`);
        setTimeout(createFFmpegProcess, 3000); // Restart after 3 seconds
    });
}

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('binaryStream', (chunk) => {
        console.log(`Received binary stream... size: ${chunk.length} bytes`);

        if (ffmpegProcess?.stdin && !ffmpegProcess.stdin.destroyed) {
            ffmpegProcess.stdin.write(chunk);
        } else {
            console.error("FFmpeg stdin is not writable! Restarting FFmpeg...");
            createFFmpegProcess();
        }
    });


    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        if (ffmpegProcess?.stdin) {
            console.log('Closing FFmpeg process to finalize MP4 file...');
            ffmpegProcess.stdin.end();  // Stop input stream
        }

        ffmpegProcess?.on('exit', () => {
            console.log('FFmpeg process exited. MP4 file should be finalized.');
        });
    });


});

const PORT = process.env.PORT || 4010;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Streaming server running on port ${PORT}`);
});
