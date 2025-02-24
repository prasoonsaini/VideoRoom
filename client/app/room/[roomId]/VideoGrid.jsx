import { username } from '@/utils/googleAuth';
import React, { useEffect, useRef, useState } from 'react';

const VideoGrid = ({ localStream, remoteStreams = [], screenStream, backgroundColor, isRecording, isStreaming, audioContextRef }) => {
    const canvasRef = useRef(null);
    const [videoRefs, setVideoRefs] = useState([]);
    const [videoData, setVideoData] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [action, setAction] = useState(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [streams, setStreams] = useState([]);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const streamSocketRef = useRef(null);
    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2px',
        },
        canvas: {
            border: '2px solid #333',
            maxWidth: '100%',
            background: backgroundColor,
            cursor: 'pointer',
            borderRadius: '10px',
        },
    };

    // First useEffect to set up streams array
    useEffect(() => {
        console.log("Remote streams: ", remoteStreams)
        const safeRemoteStreams = Array.isArray(remoteStreams) ? remoteStreams : [];
        const allStreams = [localStream, screenStream, ...safeRemoteStreams.map(stream =>
            ({ stream: stream?.stream, sender: stream?.sender })
        )].filter(Boolean);
        // allStreams.push(screenStream)

        setStreams(allStreams);

        // Calculate and set video data
        const totalUsers = allStreams.length;
        const cols = Math.ceil(Math.sqrt(totalUsers));
        const rows = Math.ceil(totalUsers / cols);
        const videoWidth = Math.floor(1000 / cols) - 20;
        const videoHeight = Math.floor(550 / rows) - 20;

        const newVideoData = allStreams.map((_, index) => ({
            x: (index % cols) * (videoWidth + 10),
            y: Math.floor(index / cols) * (videoHeight + 10),
            width: videoWidth,
            height: videoHeight,
        }));
        setVideoData(newVideoData);
    }, [localStream, remoteStreams, screenStream]);

    const startRecording = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/webm",
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = saveRecording;

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    };

    const saveRecording = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        recordedChunksRef.current = [];

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "canvas-recording.webm";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const startStreaming = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // 🎥 Capture video from canvas
        const videoStream = canvas.captureStream(30); // Capture at 30 FPS

        // 🎤 Capture audio from microphone
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 📌 Combine video & audio into one stream
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
        ]);

        // 🎬 Create MediaRecorder with combined stream
        const mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: "video/webm; codecs=vp9,opus",  // VP9 for video, Opus for audio
            videoBitsPerSecond: 3000000, // 3Mbps for better quality
            audioBitsPerSecond: 128000, // 128kbps for good audio quality
        });

        // 🌐 WebSocket for streaming data
        const socket = new WebSocket("ws://localhost:8080");
        streamSocketRef.current = socket;

        socket.onopen = () => {
            console.log("WebSocket connected, starting stream...");

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    console.log("Sending video + audio data:", event.data);

                    // Convert Blob to ArrayBuffer before sending
                    const arrayBuffer = await event.data.arrayBuffer();
                    socket.send(arrayBuffer);
                }
            };

            mediaRecorder.start(1000); // Send data every second
        };

        socket.onclose = () => {
            console.log("WebSocket closed, stopping stream...");
            stopStreaming();
        };

        mediaRecorderRef.current = mediaRecorder;
    };


    const stopStreaming = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        if (streamSocketRef.current) {
            streamSocketRef.current.close();
        }
        // setIsStreaming(false);
    };

    useEffect(() => {
        if (isStreaming) {
            startStreaming()
        }
        else {
            stopStreaming()
        }
    }, [isStreaming])


    useEffect(() => {
        if (isRecording) {
            console.log("Strated recording....")
            startRecording();
        }
        else {
            console.log("Stopped recording....")
            stopRecording();
        }
    }, [isRecording])

    useEffect(() => {
        console.log("Background color: ", backgroundColor)
    }, [backgroundColor])

    // Second useEffect to handle video refs after DOM elements are created
    useEffect(() => {
        if (streams.length === 0) {
            console.log("STREAM LENGTH IS 0...")
            return;
        }
        console.log("All streams: ", streams)
        // Create array of refs
        const refs = streams.map(() => ({
            current: document.createElement('video')
        }));

        // Set up each video element
        refs.forEach((ref, index) => {
            const video = ref.current;
            video.autoplay = true;
            video.playsInline = true;
            video.muted = index === 0; // Mute local stream

            if (streams[index]) {
                video.srcObject = streams[index].stream;
                video.play().catch(error =>
                    console.error('Error playing video:', error)
                );
            }
        });

        setVideoRefs(refs);

        // Cleanup
        return () => {
            refs.forEach(ref => {
                if (ref.current) {
                    ref.current.srcObject = null;
                }
            });
        };
    }, [streams]);

    // Canvas drawing loop
    useEffect(() => {
        let animationFrameId;
        const canvas = canvasRef.current;
        if (!canvas || videoRefs.length === 0) return;

        const ctx = canvas.getContext('2d');
        console.log("Video Refs: ", videoRefs)
        console.log("Video data: ", videoData)
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Apply rounded corners
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
            ctx.clip();

            // Fill background
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw each video
            videoRefs.forEach((ref, index) => {
                const video = ref.current;
                if (video && video.readyState >= 2 && videoData[index]) {
                    const { x, y, width, height } = videoData[index];

                    try {
                        ctx.drawImage(video, x, y, width, height);
                    } catch (error) {
                        console.error('Error drawing video:', error);
                    }

                    if (selectedVideo === index) {
                        ctx.strokeStyle = "#0099ff";
                        ctx.lineWidth = 3;
                        ctx.strokeRect(x, y, width, height);
                        ctx.fillStyle = "#0099ff";
                        ctx.fillRect(x + width - 10, y + height - 10, 10, 10);
                    }
                }
                else if (!videoData[index]) {
                    console.log("Index: ", index)
                }
            });

            ctx.restore();
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [videoRefs, videoData, selectedVideo, backgroundColor]);

    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const offsetX = (e.clientX - rect.left) * scaleX;
        const offsetY = (e.clientY - rect.top) * scaleY;

        videoData.forEach(({ x, y, width, height }, index) => {
            if (offsetX >= x && offsetX <= x + width && offsetY >= y && offsetY <= y + height) {
                setSelectedVideo(index);
                setOffset({ x: offsetX - x, y: offsetY - y });

                if (offsetX >= x + width - 10 && offsetY >= y + height - 10) {
                    setAction("resize");
                } else {
                    setAction("drag");
                }
            }
        });
    };

    const handleMouseMove = (e) => {
        if (selectedVideo === null || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const offsetX = (e.clientX - rect.left) * scaleX;
        const offsetY = (e.clientY - rect.top) * scaleY;

        setVideoData(prev =>
            prev.map((video, index) => {
                if (index !== selectedVideo) return video;

                if (action === "drag") {
                    return {
                        ...video,
                        x: Math.max(0, Math.min(offsetX - offset.x, canvasRef.current.width - video.width)),
                        y: Math.max(0, Math.min(offsetY - offset.y, canvasRef.current.height - video.height))
                    };
                } else if (action === "resize") {
                    return {
                        ...video,
                        width: Math.max(100, Math.min(offsetX - video.x, canvasRef.current.width - video.x)),
                        height: Math.max(100, Math.min(offsetY - video.y, canvasRef.current.height - video.y))
                    };
                }
                return video;
            })
        );
    };

    const handleMouseUp = () => {
        setAction(null);
        setSelectedVideo(null);
    };

    return (
        <div style={styles.container}>
            <canvas
                ref={canvasRef}
                width={1000}
                height={550}
                style={styles.canvas}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
        </div>
    );
};

export default VideoGrid;