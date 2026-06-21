import { username } from '@/utils/googleAuth';
import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import VideoGrid from './VideoGrid';

const CombinedVideoStream = ({ localStream, remoteStreams, socketRef, screenStream, backgroundColor, isRecording, isStreaming, audioContextRef, userProfiles }) => {
    const canvasRef = useRef(null);
    const combinedVideoRef = useRef(null);
    // const socketRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        if (!localStream || !canvasRef.current) return;
        const setupStreams = async () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            // Combine video streams
            const videoElements = [];
            const streams = [localStream, ...remoteStreams.map(({ stream }) => stream)];

            // Set up all streams
            for (const stream of streams) {
                // Handle video
                const video = document.createElement('video');
                video.srcObject = stream;
                video.muted = true;
                video.playsInline = true;
                video.autoplay = true;
                await new Promise(resolve => video.addEventListener('loadedmetadata', resolve));
                await video.play();
                videoElements.push(video);
            }

            // Create combined stream with both video and audio
            const combinedVideoStream = canvas.captureStream(30);

            // Update video ref
            if (combinedVideoRef.current) {
                combinedVideoRef.current.srcObject = combinedVideoStream;
            }

            const drawCombinedVideo = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Determine grid layout
                const totalVideos = videoElements.length;
                const aspectRatio = 16 / 9; // Standard video aspect ratio

                let cols, rows;

                // Find the best number of rows and columns dynamically
                for (cols = Math.ceil(Math.sqrt(totalVideos)); cols > 0; cols--) {
                    rows = Math.ceil(totalVideos / cols);
                    const cellWidth = canvas.width / cols;
                    const cellHeight = cellWidth / aspectRatio; // Maintain aspect ratio

                    if (rows * cellHeight <= canvas.height) {
                        break;
                    }
                }

                const cellWidth = canvas.width / cols;
                const cellHeight = cellWidth / aspectRatio;

                videoElements.forEach((video, index) => {
                    const row = Math.floor(index / cols);
                    const col = index % cols;

                    const x = col * cellWidth;
                    const y = row * cellHeight;

                    ctx.drawImage(video, x, y, cellWidth, cellHeight);
                });

                animationFrameRef.current = requestAnimationFrame(drawCombinedVideo);
            };


            drawCombinedVideo();

            // If already streaming, restart the MediaRecorder with the new stream
            // if (isStreaming && combinedVideoStream) {
            //     startStreamingToServer(combinedVideoStream);
            // }
        };

        setupStreams();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
        };
    }, [localStream, remoteStreams]);

    return (
        <div>
            {/* <video
                ref={combinedVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover bg-black"
            />
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="hidden"
            /> */}
            <VideoGrid localStream={localStream} remoteStreams={remoteStreams}
                screenStream={screenStream} backgroundColor={backgroundColor}
                isRecording={isRecording} isStreaming={isStreaming}
                audioContextRef={audioContextRef} userProfiles={userProfiles} />
        </div>
    );



};

export default CombinedVideoStream;
