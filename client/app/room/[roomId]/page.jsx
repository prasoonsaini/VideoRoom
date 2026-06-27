// app/[roomId]/page.jsx
"use client"
import { Device } from 'mediasoup-client';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import CombinedVideoStream from './CombinedVideoStream';
import { username } from '@/utils/googleAuth';
import { Video, VideoOff, Mic, MicOff, Monitor, Plus } from "lucide-react";
import { useWebRTCAudio } from '@/hooks/webRTCAudio';
import Controls from './Controls';
import { motion } from "framer-motion";
import { useRequireAuth } from '@/hooks/useRequireAuth';

const BACKGROUND_OPTIONS = [
    { color: "#14112A", label: "Slate" },
    { color: "#7C3AED", label: "Violet" },
    { color: "#06B6D4", label: "Cyan" },
    { color: "#FF6B6B", label: "Coral" },
    { color: "#0E0B1F", label: "Black" },
];

const StreamSettings = ({ setBackgroundColor }) => {
    const [showBackgroundOptions, setShowBackgroundOptions] = useState(false);

    return (
        <div className="relative">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-medium text-[#F5F3FF]">Background</h3>
                    <p className="mt-1 text-xs text-[#6E6890]">
                        Set the canvas background color.
                    </p>
                </div>
                <button
                    className="rounded-lg border border-[#2A2747] px-3 py-1.5 text-xs font-medium text-[#A39FC9] transition hover:bg-[#1C1838]"
                    onClick={() => setShowBackgroundOptions((prev) => !prev)}
                >
                    Edit
                </button>
            </div>

            {showBackgroundOptions && (
                <div className="absolute right-0 top-0 z-10 w-44 rounded-xl border border-[#2A2747] bg-[#1C1838] p-3 shadow-2xl">
                    <h4 className="mb-2 text-xs font-medium text-[#A39FC9]">Select background</h4>
                    <div className="grid grid-cols-5 gap-2">
                        {BACKGROUND_OPTIONS.map((bg) => (
                            <button
                                key={bg.color}
                                aria-label={bg.label}
                                className="h-7 w-7 rounded-md border border-[#3A3658] transition hover:scale-110"
                                style={{ backgroundColor: bg.color }}
                                onClick={() => {
                                    setBackgroundColor(bg.color);
                                    setShowBackgroundOptions(false);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function RoomPage() {
    const { roomId } = useParams();
    const videoRef = useRef(null);
    const socketRef = useRef();
    const deviceRef = useRef();
    const producerTransportRef = useRef();
    const consumerTransportRef = useRef();
    const producerRef = useRef();
    const consumersRef = useRef(new Map());
    const pendingProducersRef = useRef([]);
    const streamRef = useRef();
    const [isVideo, setIsVideo] = useState(false);
    const [isAudio, setIsAudio] = useState(false);
    const [remoteStreams, setRemoteStreams] = useState([]);
    const [localStream, setLocalStream] = useState(null);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [pendingAudioElements, setPendingAudioElements] = useState([]);
    const videoProducerRef = useRef(null);
    const localStreamRef = useRef(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMuted, setIsMuted] = useState(true)
    const audioContextRef = useRef();
    const analyserRef = useRef();
    const animationFrameRef = useRef();
    const [userInteracted, setUserInteracted] = useState(false);
    const [screenStream, setScreenStream] = useState(null)
    const [isRecording, setIsRecording] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState("#14112A");
    const [isStreaming, setIsStreaming] = useState(false);
    const [userProfiles, setUserProfiles] = useState({});
    const { user, loading } = useRequireAuth();

    useEffect(() => {
        const handleFirstInteraction = () => {
            setUserInteracted(true);
            pendingAudioElements.forEach(audioEl => {
                audioEl.play().catch(console.error);
            });
            setPendingAudioElements([]);
            document.removeEventListener('click', handleFirstInteraction);
        };

        document.addEventListener('click', handleFirstInteraction);
        return () => document.removeEventListener('click', handleFirstInteraction);
    }, [pendingAudioElements]);

    useEffect(() => {
        if (username) {
            setUserProfiles(prev => ({
                ...prev,
                [username]: {
                    picture: localStorage.getItem('userPicture'),
                    displayName: localStorage.getItem('userName')
                }
            }));
        }
    }, [username]);

    const handleConsumerCreated = async ({ consumerId, producerId, kind, rtpParameters, sender }) => {
        try {
            if (kind !== 'video' && kind !== 'audio') {
                console.error('Attempted to consume invalid track type');
                return;
            }

            const consumer = await consumerTransportRef.current.consume({
                id: consumerId,
                producerId,
                kind,
                rtpParameters,
            });

            const stream = new MediaStream();
            stream.addTrack(consumer.track);

            if (kind === 'video') {
                setRemoteStreams((prevStreams) => {
                    const filtered = prevStreams.filter((stream) => stream.sender !== sender);
                    return [...filtered, { producerId, stream, sender, new: true }];
                });
            }
            if (kind === 'audio') {
                const audioEl = new Audio();
                audioEl.srcObject = stream;
                audioEl.autoplay = true;
                audioEl.playsInline = true;
                if (userInteracted) {
                    try {
                        await audioEl.play();
                        console.log('Audio playback started successfully');
                    } catch (error) {
                        console.error('Error playing audio:', error);
                    }
                } else {
                    console.log('Queueing audio element for playback after user interaction');
                    setPendingAudioElements(prev => [...prev, audioEl]);
                }

                consumersRef.current.set(producerId, {
                    consumer,
                    audioElement: audioEl
                });
            }

            await consumer.resume();
            socketRef.current.emit('resumeConsumer', { consumerId });

        } catch (error) {
            console.error('Error in handleConsumerCreated:', error);
        }
    };

    const consumeTrack = async (producerId, kind, sender) => {
        if (!consumerTransportRef.current) {
            console.warn('Receive transport not ready yet.');
            return;
        }

        try {
            console.log("sendin consume message....")
            socketRef.current.emit('consume', {
                producerId,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
                transportId: consumerTransportRef.current.id,
                kind,
                sender
            });
        } catch (error) {
            console.error(`Error consuming ${kind}:`, error);
        }
    };

    const initializeAudioContext = async () => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
            } catch (error) {
                console.error('Error initializing audio context:', error);
                throw error;
            }
        }
    };

    const handleToggleMute = async () => {
        console.log("Mute toggle called--->")
        try {
            if (isMuted) {
                console.log("is muted")
                await initializeAudioContext();

                streamRef.current = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 1,
                        sampleRate: 48000,
                        sampleSize: 16
                    },
                    video: false
                });

                if (!producerTransportRef.current) {
                    await new Promise(resolve => {
                        const checkTransport = setInterval(() => {
                            if (producerTransportRef.current) {
                                clearInterval(checkTransport);
                                resolve();
                            }
                        }, 100);
                        console.log("Check Transport: ", checkTransport)
                    });
                    console.log("Go promise")
                }

                try {
                    producerRef.current = await producerTransportRef.current.produce({
                        track: streamRef.current.getAudioTracks()[0],
                        codecOptions: {
                            opusStereo: true,
                            opusDtx: true,
                        },
                    });
                }
                catch (err) {
                    console.err(err)
                }
            } else {
                console.log("is not muted")
                if (producerRef.current) {
                    producerRef.current.close();
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
            }
            setIsMuted((muted) => {
                console.log("Toggling isMuted: ", muted);
                return !muted;
            });
            console.log(isMuted)

        } catch (error) {
            console.error('Error toggling mute:', error);
            setIsMuted(true);
            throw error;
        }
    };

    const videoToggle = async () => {
        try {
            if (!isVideo) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                localStreamRef.current = stream;
                setLocalStream({ stream, sender: username, isVideo: true });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                if (!producerTransportRef.current) {
                    await new Promise((resolve) => {
                        const checkTransport = setInterval(() => {
                            if (producerTransportRef.current) {
                                clearInterval(checkTransport);
                                resolve();
                            }
                        }, 100);
                    });
                }

                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    const videoProducer = await producerTransportRef.current.produce({
                        track: videoTrack,
                        codecOptions: {
                            videoGoogleStartBitrate: 1000
                        },
                    });
                    videoProducerRef.current = videoProducer;
                }

                socketRef.current.emit("toggle-video", { sender: username, isVideo: true });

            } else {
                if (videoProducerRef.current) {
                    socketRef.current.emit('producerClosed', {
                        producerId: videoProducerRef.current.id,
                        room: roomId,
                        sender: username
                    });
                    videoProducerRef.current.close();
                    videoProducerRef.current = null;
                }

                if (localStreamRef.current) {
                    localStreamRef.current.getVideoTracks().forEach(track => {
                        track.stop();
                    });
                    localStreamRef.current = null;
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }

                setLocalStream({ sender: username, isVideo: false });

                socketRef.current.emit("toggle-video", { sender: username, isVideo: false });
            }

            setIsVideo(!isVideo);
        } catch (error) {
            console.error('Error toggling video:', error);
        }
    };


    const handleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                console.log("Screen sharing started", stream);

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                if (!producerTransportRef.current) {
                    await new Promise((resolve) => {
                        const checkTransport = setInterval(() => {
                            if (producerTransportRef.current) {
                                clearInterval(checkTransport);
                                resolve();
                            }
                        }, 100);
                    });
                }

                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    const videoProducer = await producerTransportRef.current.produce({
                        track: videoTrack,
                        codecOptions: {
                            videoGoogleStartBitrate: 1000
                        },
                    });
                    videoProducerRef.current = videoProducer;
                    console.log('Video producer created:', videoProducer);
                }
                setIsScreenSharing(true);
                setScreenStream(stream)
            } else {
                console.log("Screen sharing stopped");
                setIsScreenSharing(false);
            }
        } catch (error) {
            console.error("Error sharing screen:", error);
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log("File selected:", file);
        }
    };

    useEffect(() => {
        console.log("Remote streams:::::", remoteStreams)
    }, [remoteStreams])

    const handleRemoteToggle = (sender, isVideo) => {
        setRemoteStreams((prevStreams) =>
            prevStreams.map((stream) => {
                return stream.sender === sender ? { ...stream, isVideo } : stream
            }
            )
        );

        if (sender === username) {
            setLocalStream((prev) => ({ ...prev, isVideo }));
        }
    };


    async function connectToServer() {
        socketRef.current = io(process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            query: { roomId }
        });

        socketRef.current.on('connect', () => {
            console.log(`Connected to the socket server, Socket Id: ${socketRef.current.id}`);
            const data = {
                email: username,
                picture: localStorage.getItem('userPicture'),
                displayName: localStorage.getItem('userName')
            };
            socketRef.current.emit("joinRoom", { room: roomId, data });
            setLocalStream({ sender: username, isVideo: false, stream: null });
            deviceRef.current = new Device();
            setupWebRTC();
        });

        setupSocketListeners();
    }

    const setupWebRTC = () => {
        socketRef.current.emit('getRouterRtpCapabilities');
    };

    const setupSocketListeners = () => {
        socketRef.current.on('routerRtpCapabilities', async (routerRtpCapabilities) => {
            try {
                await deviceRef.current.load({ routerRtpCapabilities });
                socketRef.current.emit('createWebRtcTransport', { sender: true });
            } catch (error) {
                console.error('Error loading device:', error);
            }
        });

        socketRef.current.on('transportCreated', async ({ params, sender }) => {
            console.log("Transport created....", sender)
            try {
                if (sender) {
                    await setupSendTransport(params);
                } else {
                    await setupReceiveTransport(params);
                }
            } catch (error) {
                console.error('Error setting up transport:', error);
            }
        });

        socketRef.current.on('transportConnected', () => {
            console.log('Transport connected successfully');
        });

        socketRef.current.on('newProducer', async ({ producerId, kind, sender }) => {
            console.log("Received a producer: ", sender, producerId)
            if (consumerTransportRef.current) {
                await consumeTrack(producerId, kind, sender);
                console.log("consumer transport ref", consumerTransportRef)
            }
            else {
                console.log("no consumer transport ref", consumerTransportRef)
                pendingProducersRef.current.push({ producerId, kind, sender });
            }
        });

        socketRef.current.on('producerClosed', ({ producerId, sender }) => {
            console.log("Remote producer closed:", sender, producerId);
            setRemoteStreams(prev =>
                prev.map(stream =>
                    stream.producerId === producerId
                        ? { ...stream, isVideo: false }
                        : stream
                )
            );
        });

        socketRef.current.on('consumerCreated', handleConsumerCreated);
        socketRef.current.on("toggle-video", async ({ sender, isVideo }) => {
            console.log("Received video toggle: ", sender, isVideo)
            handleRemoteToggle(sender, isVideo)
        })

        socketRef.current.on('userProfile', ({ email, picture, displayName }) => {
            setUserProfiles(prev => ({
                ...prev,
                [email]: { picture, displayName }
            }));

            setRemoteStreams(prev => {
                const exists = prev.some(s => s.sender === email);
                if (exists) return prev;
                return [...prev, { sender: email, stream: null, isVideo: false, producerId: null }];
            });
        });

        socketRef.current.on('userLeft', ({ sender }) => {
            console.log("User left:", sender);
            setRemoteStreams(prev =>
                prev.filter(stream => stream.sender !== sender)
            );
        });
    };

    const handleProducerClosed = (producerId) => {
        console.log("HandleProducer Closed called...")
        const consumerData = consumersRef.current.get(producerId);
        if (consumerData) {
            const { consumer, audioElement } = consumerData;
            consumer.close();
            if (audioElement) {
                audioElement.remove();
            }
            consumersRef.current.delete(producerId);

            setRemoteStreams(prev => prev.filter(stream => stream.producerId !== producerId));
        }
    };

    const setupSendTransport = async (params) => {
        producerTransportRef.current = deviceRef.current.createSendTransport(params);

        producerTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await socketRef.current.emit('connectTransport', {
                    transportId: params.id,
                    dtlsParameters
                });
                callback();
            } catch (error) {
                errback(error);
            }
        });

        producerTransportRef.current.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
            try {
                socketRef.current.emit('produce', {
                    transportId: producerTransportRef.current.id,
                    kind,
                    rtpParameters,
                    room: roomId,
                    sender: username
                }, ({ producerId }) => {
                    callback({ id: producerId });
                });
            } catch (error) {
                errback(error);
            }
        });

        socketRef.current.emit('createWebRtcTransport', { sender: false });
    };

    const setupReceiveTransport = async (params) => {
        consumerTransportRef.current = deviceRef.current.createRecvTransport(params);

        consumerTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await socketRef.current.emit('connectTransport', {
                    transportId: params.id,
                    dtlsParameters
                });
                callback();
            } catch (error) {
                errback(error);
            }
        });
        console.log("Receive transport ready, flushing queue:", pendingProducersRef.current.length, "producers")
        for (const p of pendingProducersRef.current) {
            await consumeTrack(p.producerId, p.kind, p.sender);
        }
        pendingProducersRef.current = [];
    };

    useEffect(() => {
        if (!user) return;
        connectToServer();
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (videoProducerRef.current) videoProducerRef.current.close();
            consumersRef.current.forEach(({ audioElement }) => {
                if (audioElement) audioElement.remove();
            });
        };
    }, [user]);

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#0E0B1F]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2A2747] border-t-[#7C3AED]" />
                    <span className="text-sm text-[#6E6890]">Checking authentication…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen flex-col bg-[#0E0B1F] lg:flex-row">
            {/* Main Video Section */}
            <motion.div
                className="flex flex-1 flex-col gap-3 p-3 md:p-5 lg:gap-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                {/* Room info bar */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#34D399]" />
                        <span className="text-sm font-medium text-[#F5F3FF]">{roomId}</span>
                    </div>
                    <span className="text-xs text-[#6E6890]">
                        {remoteStreams.length + 1} {remoteStreams.length === 0 ? "person" : "people"}
                    </span>
                </div>

                {/* Video Stream */}
                <motion.div
                    className="relative flex w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border border-[#2A2747] bg-[#14112A]"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    <CombinedVideoStream
                        localStream={localStream}
                        remoteStreams={remoteStreams}
                        socketRef={socketRef}
                        screenStream={screenStream}
                        backgroundColor={backgroundColor}
                        isRecording={isRecording}
                        isStreaming={isStreaming}
                        audioContextRef={audioContextRef}
                        userProfiles={userProfiles}
                    />

                    {isRecording && (
                        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-[#E24B4A]" />
                            <span className="text-xs font-medium text-white">Recording</span>
                        </div>
                    )}
                    {isStreaming && (
                        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-[#34D399]" />
                            <span className="text-xs font-medium text-white">Live</span>
                        </div>
                    )}
                </motion.div>

                {/* Controls Bar */}
                <motion.div
                    className="flex justify-center rounded-2xl border border-[#2A2747] bg-[#14112A] p-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
                >
                    <Controls
                        isVideo={isVideo}
                        videoToggle={videoToggle}
                        isMuted={isMuted}
                        handleToggleMute={handleToggleMute}
                        handleScreenShare={handleScreenShare}
                        handleFileUpload={handleFileUpload}
                    />
                </motion.div>
            </motion.div>

            {/* Sidebar - Stream Settings & Actions */}
            <motion.div
                className="flex w-full flex-col gap-3 border-t border-[#2A2747] p-3 md:p-5 lg:w-[340px] lg:border-l lg:border-t-0"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            >
                {/* Stream Settings */}
                <div className="rounded-2xl border border-[#2A2747] bg-[#14112A] p-5">
                    <h2 className="mb-4 text-sm font-semibold text-[#F5F3FF]">Stream settings</h2>
                    <StreamSettings setBackgroundColor={setBackgroundColor} />

                    <div className="mt-4 border-t border-[#2A2747] pt-4">
                        <h3 className="text-xs font-medium text-[#A39FC9]">Stream layout</h3>
                        <p className="mt-1 text-xs text-[#6E6890]">
                            Adjust how tiles are arranged on the canvas.
                        </p>
                        <button className="mt-3 rounded-lg border border-[#2A2747] px-4 py-2 text-xs font-medium text-[#F5F3FF] transition hover:bg-[#1C1838]">
                            Edit layout
                        </button>
                    </div>
                </div>

                {/* Stream Actions */}
                <div className="rounded-2xl border border-[#2A2747] bg-[#14112A] p-5">
                    <h2 className="mb-4 text-sm font-semibold text-[#F5F3FF]">Stream actions</h2>

                    <div className="flex gap-3">
                        <button
                            className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${isStreaming
                                ? "bg-[#34D399]/15 text-[#6EE7B7] hover:bg-[#34D399]/25"
                                : "border border-[#2A2747] text-[#A39FC9] hover:bg-[#1C1838]"
                                }`}
                            onClick={() => setIsStreaming(!isStreaming)}
                        >
                            {isStreaming ? "Stop streaming" : "Start streaming"}
                        </button>

                        <button
                            className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${isRecording
                                ? "bg-[#E24B4A]/15 text-[#F09595] hover:bg-[#E24B4A]/25"
                                : "text-[#0E0B1F] hover:scale-[1.02]"
                                }`}
                            style={!isRecording ? { background: "linear-gradient(135deg, #A78BFA, #06B6D4)" } : {}}
                            onClick={() => setIsRecording(!isRecording)}
                        >
                            {isRecording ? "Stop recording" : "Start recording"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
