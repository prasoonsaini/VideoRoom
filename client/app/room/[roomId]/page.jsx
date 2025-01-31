// app/[roomId]/page.jsx
"use client"
import { Device } from 'mediasoup-client';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import CombinedVideoStream from './CombinedVideoStream';

export default function RoomPage() {
    const { roomId } = useParams();
    const videoRef = useRef(null);
    const socketRef = useRef();
    const deviceRef = useRef();
    const producerTransportRef = useRef();
    const consumerTransportRef = useRef();
    const producerRef = useRef();
    const consumersRef = useRef(new Map());
    const streamRef = useRef();
    const [isVideo, setIsVideo] = useState(false);
    const [isAudio, setIsAudio] = useState(false);
    const [connectedPeers, setConnectedPeers] = useState(0);
    const [remoteStreams, setRemoteStreams] = useState([]);
    const [localStream, setLocalStream] = useState(null);
    const audioRef = useRef(null);

    const handleConsumerCreated = async ({ consumerId, producerId, kind, rtpParameters }) => {
        console.log("Received a consumer: ", consumerId, producerId, kind, rtpParameters);

        try {
            // Ensure the kind is video
            if (kind !== 'video' && kind !== 'audio') {
                console.error('Attempted to consume non-video track');
                return;
            }

            // Consume the video track
            const consumer = await consumerTransportRef.current.consume({
                id: consumerId,
                producerId,
                kind,
                rtpParameters,
            });

            console.log("This is the consumer: ", consumer);

            // Create a MediaStream to play the video
            const stream = new MediaStream();
            stream.addTrack(consumer.track);
            console.log("Remote stream: ", stream);
            console.log("KIND::: ", kind)
            if (kind === 'video') {
                console.log("******")
                setRemoteStreams((prevStreams) => [...prevStreams, { producerId, stream }]);
            } else if (kind === 'audio') {
                // Handle audio stream separately if needed
                const audioElement = new Audio();
                audioElement.srcObject = stream;
                audioElement.play();
            }

            // Assign the stream to the videoRef element
            // if (videoRef.current) {
            //     videoRef.current.srcObject = stream;
            // } else {
            //     console.error('videoRef is not set');
            // }

            // setRemoteStreams((prevStreams) => [...prevStreams, { producerId, stream }]);
            // Store the consumer
            consumersRef.current.set(producerId, {
                consumer,
                kind
            });

            setConnectedPeers(consumersRef.current.size);

            // Resume the consumer
            await consumer.resume();
            socketRef.current.emit('resumeConsumer', { consumerId });

            console.log('Video consumer setup complete for producer:', producerId);
        } catch (error) {
            console.error('Error in handleConsumerCreated:', error);
        }
    };


    const consumeVideo = async (producerId, kind) => {
        if (!consumerTransportRef.current) {
            console.warn('Receive transport not ready yet.');
            return;
        }

        try {
            socketRef.current.emit('consume', {
                producerId,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
                transportId: consumerTransportRef.current.id,
                kind
            });
        } catch (error) {
            console.error('Error consuming video:', error);
        }
    };

    const consumeTrack = async (producerId, kind) => {
        if (!consumerTransportRef.current) {
            console.warn('Receive transport not ready yet.');
            return;
        }

        try {
            socketRef.current.emit('consume', {
                producerId,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
                transportId: consumerTransportRef.current.id,
                kind
            });
        } catch (error) {
            console.error(`Error consuming ${kind}:`, error);
        }
    };

    // Audio toggle functionality
    const audioToggle = async () => {
        try {
            if (!isAudio) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioTrack = stream.getAudioTracks()[0];

                if (audioTrack) {
                    const audioProducer = await producerTransportRef.current.produce({
                        track: audioTrack,
                        codecOptions: {
                            opusStereo: true,
                            opusDtx: true
                        }
                    });

                    console.log('Audio producer created:', audioProducer);
                }
            } else {
                // Stop audio production
                if (producerTransportRef.current) {
                    const audioProducers = producerTransportRef.current.producers.filter(
                        (producer) => producer.kind === 'audio'
                    );
                    audioProducers.forEach((producer) => producer.close());
                }
            }

            setIsAudio(!isAudio);
        } catch (error) {
            console.error('Error toggling audio:', error);
        }
    };


    const videoToggle = async () => {
        console.log("Video toggle called...");
        try {
            if (!isVideo) {
                // Start capturing video stream
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                console.log("Local stream: ", stream)
                setLocalStream(stream)
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                // Ensure the SendTransport is ready
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

                // Produce the video track
                const videoTrack = stream.getVideoTracks()[0];
                console.log("VIDEO TRACK", videoTrack)
                if (videoTrack) {
                    const videoProducer = await producerTransportRef.current.produce({
                        track: videoTrack,
                        codecOptions: {
                            videoGoogleStartBitrate: 1000, // Optional, for better quality
                        },
                    });

                    console.log('Video producer created:', videoProducer);
                }
            } else {
                // Stop video production and stream
                if (producerTransportRef.current) {
                    const videoProducers = producerTransportRef.current.producers.filter(
                        (producer) => producer.kind === 'video'
                    );
                    videoProducers.forEach((producer) => producer.close());
                }

                if (videoRef.current && videoRef.current.srcObject) {
                    const tracks = videoRef.current.srcObject.getTracks();
                    tracks.forEach((track) => track.stop());
                    videoRef.current.srcObject = null;
                }
            }

            setIsVideo(!isVideo);
        } catch (error) {
            console.error('Error toggling video:', error);
        }
    };
    async function connetToServer() {
        console.log("Connecting to Audio Server...")
        socketRef.current = io('http://localhost:4000', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            query: { roomId } // Add roomId to connection query
        });

        socketRef.current.on('connect', () => {
            console.log(`Connected to the socket server, My socket Id : ${socketRef.current.id}`);
            deviceRef.current = new Device();
            setupWebRTC()
        });
        setupSocketListeners();
    }
    const setupWebRTC = () => {
        console.log("Asking for rtpcapabilities...")
        socketRef.current.emit('getRouterRtpCapabilities');
    };

    const setupSocketListeners = () => {
        socketRef.current.on('routerRtpCapabilities', async (routerRtpCapabilities) => {
            try {
                await deviceRef.current.load({ routerRtpCapabilities });
                console.log("Received routerRtpCapabilities: ", routerRtpCapabilities)
                socketRef.current.emit('createWebRtcTransport', { sender: true });
            } catch (error) {
                console.error('Error loading device:', error);
            }
        });
        socketRef.current.on('transportCreated', async ({ params, sender }) => {
            console.log("received transport ", params, sender)
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
        socketRef.current.on('newProducer', async ({ producerId, kind }) => {
            console.log("Received new producer: ", producerId, kind)
            if (consumerTransportRef.current) {
                if (kind === 'video')
                    await consumeVideo(producerId, 'video');
                else if (kind === 'audio')
                    await consumeTrack(producerId, 'audio');
            }
        });
        socketRef.current.on('consumerCreated', handleConsumerCreated);
        socketRef.current.on('producerClosed', handleProducerClosed);

        socketRef.current.on('peers', (peers) => {
            setConnectedPeers(peers.length);
        });
    }
    const handleProducerClosed = (producerId) => {
        const consumerData = consumersRef.current.get(producerId);
        if (consumerData) {
            const { consumer, audioElement } = consumerData;
            consumer.close();
            audioElement.remove();
            consumersRef.current.delete(producerId);
        }
    };

    const setupSendTransport = async (params) => {
        producerTransportRef.current = deviceRef.current.createSendTransport(params);

        producerTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                console.log("asking to connect transport...")
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
                    rtpParameters
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

    useEffect(() => {
        const startVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing webcam: ", err);
            }
        };

        startVideo();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach((track) => track.stop());
            }
        };
    }, []);


    useEffect(() => {
        connetToServer()
    }, [])

    useEffect(() => {
        console.log("REMOTE STREAMS: ", remoteStreams)
    }, [remoteStreams])

    useEffect(() => {
        console.log("LOCAL STREAMS: ", localStream)
    }, [localStream])

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <h1 className="text-3xl font-bold text-center">Welcome to Room: {roomId}</h1>
            <p className="text-lg mt-4 text-center">
                You are currently in the video call room with ID: <strong>{roomId}</strong>
            </p>
            {/* My Video */}
            {/* <div style={{ margin: '20px 0', textAlign: 'center' }}>
                <h2 className="text-2xl font-semibold">My Video</h2>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{
                        width: '50%',
                        height: 'auto',
                        border: '3px solid green',
                        borderRadius: '10px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                        margin: '20px auto',
                    }}
                />
            </div> */}

            {/* Remote Streams */}
            {/* <div style={{ marginTop: '30px' }}>
                <h2 className="text-2xl font-semibold text-center">Participants</h2>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '15px',
                        marginTop: '20px',
                        padding: '10px',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '10px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    {remoteStreams.map(({ producerId, stream }) => (
                        <video
                            key={producerId}
                            autoPlay
                            playsInline
                            style={{
                                width: '100%',
                                height: 'auto',
                                border: '2px solid blue',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                            }}
                            ref={(el) => {
                                if (el && !el.srcObject) {
                                    el.srcObject = stream;
                                }
                            }}
                        />
                    ))}
                </div>
            </div> */}

            {/* Combined Video Stream */}
            <div style={{ marginTop: '30px' }}>
                <h2 className="text-2xl font-semibold text-center">Combined Video Stream</h2>
                <CombinedVideoStream
                    localStream={localStream}
                    remoteStreams={remoteStreams}
                />
            </div>

            {/* Toggle Button and Peers */}
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <button
                    onClick={videoToggle}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007BFF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    Toggle Video
                </button>
                <button
                    onClick={audioToggle}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    Toggle Audio
                </button>
            </div>
        </div>
    );

}
