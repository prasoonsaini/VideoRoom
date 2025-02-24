import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import { username } from '@/utils/googleAuth';

export const useWebRTCAudio = (socketRef) => {
    // State declarations remain the same
    const [isMuted, setIsMuted] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [connectedPeers, setConnectedPeers] = useState(0);
    const [pendingAudioElements, setPendingAudioElements] = useState([]);
    const [userInteracted, setUserInteracted] = useState(false);

    // Refs remain the same
    // const socketRef = useRef();
    const deviceRef = useRef();
    const producerTransportRef = useRef();
    const consumerTransportRef = useRef();
    const producerRef = useRef();
    const consumersRef = useRef(new Map());
    const streamRef = useRef();
    const audioContextRef = useRef();
    const analyserRef = useRef();
    const animationFrameRef = useRef();
    // const roomRef = useRef(roomId);

    // Initialize audio context
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

    // Audio level monitoring
    const startAudioLevelMonitoring = (stream) => {
        console.log("Starting audio level monitoring.......")
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) return;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const checkAudioLevel = () => {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(average);
            animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
    };

    const handleConsumerCreated = async ({ consumerId, producerId, kind, rtpParameters }) => {
        try {
            const consumer = await consumerTransportRef.current.consume({
                id: consumerId,
                producerId,
                kind,
                rtpParameters
            });

            const stream = new MediaStream();
            stream.addTrack(consumer.track);

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

            setConnectedPeers(consumersRef.current.size);

            await consumer.resume();
            socketRef.current.emit('resumeConsumer', { consumerId });

            console.log('Consumer setup complete for producer:', producerId);
        } catch (error) {
            console.error('Error in handleConsumerCreated:', error);
        }
    };

    // Fixed consumeAudio function
    const consumeAudio = async (producerId) => {
        try {
            socketRef.current.emit('consume', {
                producerId,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
                transportId: consumerTransportRef.current.id,
                consumerEmail: username
            });
        } catch (error) {
            console.error('Error consuming audio:', error);
        }
    };

    // Connect to audio server with room context
    const connectToAudioServer = () => {
        console.log('Connecting to audio server...');
        // socketRef.current = io('http://localhost:4000', {
        //     transports: ['websocket'],
        //     reconnection: true,
        //     reconnectionAttempts: 5,
        //     reconnectionDelay: 1000,
        //     reconnectionDelayMax: 5000,
        //     timeout: 20000,
        //     query: { roomId } // Add roomId to connection query
        // });

        // socketRef.current.on('connect', () => {
        //     console.log('Connected to audio server:', socketRef.current.id);
        //     setIsConnected(true);
        //     deviceRef.current = new Device();
        //     setupWebRTC();
        // });

        // setupSocketListeners();
    };

    // Rest of the functions remain the same
    const setupWebRTC = () => {
        socketRef.current.emit('getRouterRtpCapabilities');
    };

    // Setup socket listeners
    const setupSocketListeners = () => {
        socketRef.current.on('routerRtpCapabilities', async (routerRtpCapabilities) => {
            console.log("asked for rtp capabilities")
            try {
                await deviceRef.current.load({ routerRtpCapabilities });
                socketRef.current.emit('createWebRtcTransport', { sender: true });
            } catch (error) {
                console.error('Error loading device:', error);
            }
        });

        socketRef.current.on('transportCreated', async ({ params, sender }) => {
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

        socketRef.current.on('newProducer', async ({ producerId, sendersRoomId, senderEmail }) => {
            console.log("received new Producer...", { producerId, sendersRoomId, senderEmail });

            // Only consume if the producer is from the current room
            console.log("room refff", roomRef.current)
            if (sendersRoomId === roomRef.current && username !== senderEmail) {
                if (consumerTransportRef.current) {
                    await consumeAudio(producerId);
                }
            }
        });

        socketRef.current.on('consumerCreated', handleConsumerCreated);
        socketRef.current.on('producerClosed', handleProducerClosed);

        socketRef.current.on('peers', (peers) => {
            setConnectedPeers(peers.length);
        });
    };

    // Setup send transport
    const setupSendTransport = async (params) => {
        producerTransportRef.current = deviceRef.current.createSendTransport(params);

        producerTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
            console.log("got a connection req ....")
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
            console.log("Sending produce.....")
            try {
                socketRef.current.emit('produce', {
                    transportId: producerTransportRef.current.id,
                    kind,
                    rtpParameters,
                    roomId,
                    email: username
                }, ({ producerId }) => {
                    callback({ id: producerId });
                });
            } catch (error) {
                errback(error);
            }
        });

        socketRef.current.emit('createWebRtcTransport', { sender: false });
    };

    // Setup receive transport
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
    };

    const handleProducerClosed = (producerId) => {
        const consumerData = consumersRef.current.get(producerId);
        if (consumerData) {
            const { consumer, audioElement } = consumerData;
            consumer.close();
            audioElement.remove();
            consumersRef.current.delete(producerId);
        }
    };

    // Toggle mute function
    const handleToggleMute = async () => {
        console.log("Mute toggle called--->")
        try {
            if (isMuted) {
                console.log("is muted --------->>>>")
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

                startAudioLevelMonitoring(streamRef.current);
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
                console.log("is not muted --------->>>>")
                if (producerRef.current) {
                    producerRef.current.close();
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                setAudioLevel(0);
            }
            setIsMuted((muted) => {
                console.log("Toggling isMuted: ", muted); // Log the current and toggled state
                return !muted;
            });
            console.log(isMuted)

        } catch (error) {
            console.error('Error toggling mute:', error);
            setIsMuted(true);
            setAudioLevel(0);
            throw error;
        }
    };

    // Cleanup function
    const cleanup = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (producerRef.current) {
            producerRef.current.close();
        }
        if (producerTransportRef.current) {
            producerTransportRef.current.close();
        }
        if (consumerTransportRef.current) {
            consumerTransportRef.current.close();
        }
        consumersRef.current.forEach(({ consumer, audioElement }) => {
            consumer.close();
            audioElement.remove();
        });
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };

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

    // useEffect(() => {
    //     roomRef.current = roomId;
    // }, [roomId]);

    // Effect for room connection
    // useEffect(() => {
    //     console.log("Room id in webrtc audio: ", roomId)
    //     if (isRoomActive && roomId) {
    //         connectToAudioServer();
    //     }
    //     return cleanup;
    // }, [isRoomActive, roomId, socketRef]);

    return {
        isMuted,
        isConnected,
        audioLevel,
        connectedPeers,
        handleToggleMute,
        setAudioLevel,
        userInteracted
    };
};