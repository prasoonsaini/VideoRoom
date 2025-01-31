import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const CombinedVideoStream = ({ localStream, remoteStreams }) => {
    const canvasRef = useRef(null);
    const combinedVideoRef = useRef(null);
    const socketRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const animationFrameRef = useRef(null);

    const [isStreaming, setIsStreaming] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    useEffect(() => {
        socketRef.current = io('http://localhost:3001');
        socketRef.current.on('connect', () => console.log("Connected to streaming server"));
        socketRef.current.on('disconnect', () => {
            console.log("Disconnected from streaming server");
            setIsStreaming(false);
            setIsRecording(false);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

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

                const cols = Math.ceil(Math.sqrt(videoElements.length));
                const rows = Math.ceil(videoElements.length / cols);
                const margin = 30;
                const cellWidth = (canvas.width - (cols + 1) * margin) / cols;
                const cellHeight = (canvas.height - (rows + 1) * margin) / rows;

                videoElements.forEach((video, index) => {
                    const row = Math.floor(index / cols);
                    const col = index % cols;

                    const x = col * (cellWidth + margin) + margin;
                    const y = row * (cellHeight + margin) + margin;

                    ctx.fillStyle = "#f0f0f0";
                    ctx.fillRect(x, y, cellWidth, cellHeight);
                    ctx.drawImage(video, x, y, cellWidth, cellHeight);
                });

                animationFrameRef.current = requestAnimationFrame(drawCombinedVideo);
            };

            drawCombinedVideo();

            // If already streaming, restart the MediaRecorder with the new stream
            if (isStreaming && combinedVideoStream) {
                startStreamingToServer(combinedVideoStream);
            }
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
    }, [localStream, remoteStreams, isStreaming]);

    const startStreamingToServer = (stream) => {
        try {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }

            const options = {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 2500000,
                audioBitsPerSecond: 128000
            };

            const mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorder.ondataavailable = (event) => {
                console.log('Binary Stream Available', event.data);
                socketRef.current.emit('binarystream', event.data);
            };

            // Request data every 100ms
            mediaRecorder.start(1000);
            mediaRecorderRef.current = mediaRecorder;
            console.log("MediaRecorder started");

        } catch (error) {
            console.error("Error starting media recorder:", error);
            setIsStreaming(false);
        }
    };

    const startStreaming = () => {
        if (combinedVideoRef.current) {
            const stream = combinedVideoRef.current.srcObject;
            if (stream) {
                console.log("Starting stream...", stream)
                startStreamingToServer(stream);
                setIsStreaming(true);
            } else {
                console.error("No stream available");
            }
        }
    };

    const stopStreaming = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            console.log("Stopping stream...")
            mediaRecorderRef.current.stop();
            console.log('Recording stopped.');
            socketRef.current.emit('stopstream');
        }
        setIsStreaming(false);
    };

    return (
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <video
                ref={combinedVideoRef}
                autoPlay
                playsInline
                style={{
                    width: '100%',
                    maxWidth: '800px',
                    border: '2px solid red',
                    borderRadius: '10px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    marginTop: '20px',
                }}
            />

            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                style={{ display: 'none' }}
            />

            <div style={{ marginTop: '10px' }}>
                <button
                    onClick={startStreaming}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Start Streaming
                </button>
                <button
                    onClick={stopStreaming}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Stop Streaming
                </button>
            </div>
        </div>
    );
};

export default CombinedVideoStream;
