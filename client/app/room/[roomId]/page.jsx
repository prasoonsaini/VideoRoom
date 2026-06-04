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
const StreamSettings = ({ setBackgroundColor }) => {
    const [showBackgroundOptions, setShowBackgroundOptions] = useState(false);
    const backgroundColors = ["#FF5733", "#33FF57", "#3357FF", "#F0F0F0", "#000000"];

    return (
        <div className="relative">
            <div className="mb-6 pb-4 flex justify-between items-center">
                <div>
                    <h3 className="text-xs font-medium">Background</h3>
                    <p className="text-gray-400 text-xs mt-2">
                        Customize your stream background <br />to match your style.
                    </p>
                </div>
                <button
                    className="text-xs hover:bg-slate-300 self-center bg-slate-200 px-5 py-1 rounded-md"
                    onClick={() => setShowBackgroundOptions((prev) => !prev)}
                >
                    Edit
                </button>
            </div>

            {showBackgroundOptions && (
                <div className="absolute top-0 right-0 bg-white shadow-lg p-3 rounded-lg w-48 z-10">
                    <h4 className="text-xs font-semibold mb-2">Select Background</h4>
                    <div className="grid grid-cols-5 gap-2">
                        {backgroundColors.map((color) => (
                            <div
                                key={color}
                                className="w-8 h-8 rounded cursor-pointer"
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    setBackgroundColor(color);
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
    const pendingProducersRef = useRef([]); ////
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
    // let room;
    const [isMuted, setIsMuted] = useState(true)
    const audioContextRef = useRef();
    const analyserRef = useRef();
    const animationFrameRef = useRef();
    const [userInteracted, setUserInteracted] = useState(false);
    const [screenStream, setScreenStream] = useState(null)
    const [isRecording, setIsRecording] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState("#3357FF");
    const [isStreaming, setIsStreaming] = useState(false);

    // useEffect(() => {
    //     const url = window.location.pathname;
    //     const parts = url.split("/");
    //     room = parts[parts.length - 1];
    // }, []);

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

    const handleConsumerCreated = async ({ consumerId, producerId, kind, rtpParameters, sender }) => {
        // console.log(`received a cinsumer sender is ${sender}`)
        // console.log("Received a consumer: ", consumerId, producerId, kind, rtpParameters);

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
                    // Remove older stream from the same sender
                    const filtered = prevStreams.filter((stream) => stream.sender !== sender);

                    // Add the new stream
                    return [...filtered, { producerId, stream, sender, new: true }];
                });
                // setRemoteStreams((prevStreams) => [...prevStreams, { producerId, stream, sender, new: true }]);
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

            // setConnectedPeers(consumersRef.current.size);
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
                // setAudioLevel(0);
            }
            setIsMuted((muted) => {
                console.log("Toggling isMuted: ", muted); // Log the current and toggled state
                return !muted;
            });
            console.log(isMuted)

        } catch (error) {
            console.error('Error toggling mute:', error);
            setIsMuted(true);
            // setAudioLevel(0);
            throw error;
        }
    };

    const videoToggle = async () => {
        try {
            if (!isVideo) {
                // Starting video
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

                // Notify others that video is ON
                socketRef.current.emit("toggle-video", { sender: username, isVideo: true });

            } else {
                // Stopping video
                if (videoProducerRef.current) {
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

                setLocalStream({ sender: username, isVideo: false });  // Ensure this updates properly

                // Notify others that video is OFF
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
            // You can process the file (e.g., upload to a server)
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

        // Handle local user case
        if (sender === username) {
            setLocalStream((prev) => ({ ...prev, isVideo }));
        }
    };


    async function connectToServer() {
        socketRef.current = io('http://localhost:4000', {
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
            const data = { email: username };
            socketRef.current.emit("joinRoom", { room: roomId, data });
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

        socketRef.current.on('consumerCreated', handleConsumerCreated);
        // socketRef.current.on('producerClosed', handleProducerClosed);
        // socketRef.current.on('peers', (peers) => {
        //     setConnectedPeers(peers.length);
        // });
        socketRef.current.on("toggle-video", async ({ sender, isVideo }) => {
            console.log("Received video toggle: ", sender, isVideo)
            handleRemoteToggle(sender, isVideo)
        })

        // Add this inside setupSocketListeners()
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

            // Remove from remote streams if it was a video stream
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
        connectToServer();
        return () => {
            // Cleanup function
            if (socketRef.current) {
                socketRef.current.disconnect();
            }

            // Clean up all media streams
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }

            // Clean up producers
            if (videoProducerRef.current) {
                videoProducerRef.current.close();
            }

            // Clean up audio elements
            consumersRef.current.forEach(({ audioElement }) => {
                if (audioElement) {
                    audioElement.remove();
                }
            });
        };
    }, []);

    // useEffect(() => {
    //     document.body.style.overflow = "hidden";
    //     return () => {
    //         document.body.style.overflow = "auto";
    //     };
    // }, []);
    return (
        <div className="flex justify-center items-center h-screen w-screen bg-[#121212]">
            <motion.div
                className="flex w-full h-full p-6 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                {/* Main Video Section */}
                <div className="w-8/12 flex flex-col gap-0">
                    {/* Video Stream */}
                    <motion.div
                        className="w-full aspect-[16/9] bg-[#1E1E1E] flex items-center justify-center relative rounded-xl shadow-lg"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
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
                        />
                    </motion.div>

                    {/* Controls Section */}
                    <motion.div
                        className="p-2 rounded-lg bg-[#242424] shadow-md flex justify-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
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
                </div>

                {/* Sidebar - Stream Settings & Actions */}
                <motion.div
                    className="w-4/12 flex flex-col gap-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                >
                    {/* Stream Settings */}
                    <motion.div
                        className="bg-[#242424] text-white p-5 rounded-lg shadow-md"
                        whileHover={{ scale: 1.02 }}
                    >
                        <h2 className="text-lg font-semibold mb-4">Stream Settings</h2>
                        <StreamSettings setBackgroundColor={setBackgroundColor} />

                        {/* Layout Settings */}
                        <div className="mt-4 border-t border-gray-600 pt-4">
                            <h3 className="text-sm font-medium">Stream Layout</h3>
                            <p className="text-gray-400 text-xs mt-1">
                                Adjust the layout of your stream to best suit your content.
                            </p>
                            <motion.button
                                className="mt-3 bg-[#333] hover:bg-[#444] text-sm px-4 py-2 rounded-md transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Edit Layout
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Stream Actions */}
                    <motion.div
                        className="bg-[#242424] text-white p-5 rounded-lg shadow-md"
                        whileHover={{ scale: 1.02 }}
                    >
                        <h2 className="text-lg font-semibold mb-4">Stream Actions</h2>

                        <div className="flex gap-3">
                            {/* Start/Stop Streaming */}
                            <motion.button
                                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isStreaming
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                    }`}
                                onClick={() => setIsStreaming(!isStreaming)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
                            </motion.button>

                            {/* Start/Stop Recording */}
                            <motion.button
                                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isRecording
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                onClick={() => setIsRecording(!isRecording)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isRecording ? 'Stop Recording' : 'Start Recording'}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
}