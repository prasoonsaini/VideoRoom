// server.js
import { Server } from "socket.io";
import mediasoupServer from './mediasoup-server.js';

const io = new Server(4000, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Initialize mediasoup server
await mediasoupServer.init();

const peers = new Map();
const rooms = new Map();
const MAX_USERS_PER_ROOM = 20;
const usersInRoom = new Map();
const usersToSocket = new Map();
const roomToProducers = new Map();
const userProfiles = new Map(); // email -> { picture, displayName }
io.on("connection", async (socket) => {
    console.log("User connected:", socket.id);

    // Add peer to the map
    peers.set(socket.id, {
        socket,
        producers: new Map(),
        consumers: new Map(),
        producerTransport: null,
        consumerTransport: null
    });

    // Emit current peers to everyone
    io.emit('peers', Array.from(peers.keys()));

    socket.on('getRouterRtpCapabilities', async () => {
        let attempts = 0;
        const maxAttempts = 3;
        // console.log("asked for rtp capabilities...")
        const attemptConnection = async () => {
            try {
                const router = await mediasoupServer.getRouter();
                socket.emit('routerRtpCapabilities', router.rtpCapabilities);
            } catch (error) {
                attempts++;
                // console.error(`Error getting router capabilities (attempt ${attempts}):`, error);

                if (attempts < maxAttempts) {
                    setTimeout(attemptConnection, 1000 * attempts); // Exponential backoff
                } else {
                    socket.emit('error', {
                        type: 'ROUTER_CAPABILITIES_ERROR',
                        message: error.message,
                        recoverable: false
                    });
                }
            }
        };

        await attemptConnection();
    });

    socket.on('createWebRtcTransport', async ({ sender }) => {
        try {
            const { transport, params } = await mediasoupServer.createWebrtcTransport()
            mediasoupServer.addTransport(socket.id, transport, sender);
            socket.emit('transportCreated', { params, sender });
        } catch (error) {
            console.error('Error creating transport:', error);
            socket.emit('error', error.message);
        }
    });

    socket.on('connectTransport', async ({ transportId, dtlsParameters }) => {
        // console.log("asked to connect transport", transportId, dtlsParameters)
        try {
            const transport = mediasoupServer.getTransport(socket.id, transportId);
            await transport.connect({ dtlsParameters });
            socket.emit('transportConnected');
        } catch (error) {
            console.error('Error connecting transport:', error);
            socket.emit('error', error.message);
        }
    });

    socket.on('produce', async ({ transportId, kind, rtpParameters, room, sender }, callback) => {
        console.log("Asked to produce: ", room, sender)
        try {
            const transport = mediasoupServer.getTransport(socket.id, transportId, true);
            const producer = await transport.produce({ kind, rtpParameters });
            mediasoupServer.addProducer(socket.id, producer);

            // Notify all other users about the new producer
            // console.log("Sending new producer", producer.id, socket.id)

            socket.broadcast.emit('newProducer', {
                producerId: producer.id,
                producerSocketId: socket.id,
                kind: kind,
                sender
            });
            if (!roomToProducers.has(room)) {
                roomToProducers.set(room, new Set()); // Initialize with an empty Set
            }
            roomToProducers.get(room).add({ producerId: producer.id, kind, sender }); // Add producer ID
            console.log("roomToProducers: ", roomToProducers)

            // usersInRoom.get(room).forEach((user) => {
            //     if (user !== sender) {
            //         const sock = usersToSocket.get(user);
            //         console.log(room, sock.id)
            //         io.to(sock.id).emit("newProducer", {
            //             producerId: producer.id,
            //             producerSocketId: socket.id,
            //             kind: kind,
            //             sender
            //         })
            //     }
            // })
            callback({ producerId: producer.id });
        } catch (error) {
            console.error('Error creating producer:', error);
            socket.emit('error', error.message);
        }
    });

    socket.on('producerClosed', ({ producerId, room, sender }) => {
        console.log("Producer closed:", producerId, sender);

        const producers = roomToProducers.get(room);
        if (producers) {
            for (const p of producers) {
                if (p.producerId === producerId) {
                    producers.delete(p);
                    break;
                }
            }
        }
        console.log("roomToProducers after cleanup:", roomToProducers);

        // Tell other users this producer is gone
        socket.to(room).emit('producerClosed', { producerId, sender });
    });

    socket.on('consume', async ({ producerId, rtpCapabilities, transportId, kind, sender }) => {
        console.log("asked to consume...", sender)
        try {
            const router = await mediasoupServer.getRouter();
            const transport = mediasoupServer.getTransport(socket.id, transportId, false);

            if (!router.canConsume({ producerId, rtpCapabilities })) {
                throw new Error('Cannot consume the producer');
            }

            const consumer = await transport.consume({
                producerId,
                rtpCapabilities,
                paused: true,
                kind: kind
            });

            mediasoupServer.addConsumer(socket.id, consumer);
            // console.log("sending consumer......", consumer.kind)
            socket.emit('consumerCreated', {
                consumerId: consumer.id,
                producerId: consumer.producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                type: consumer.type,
                producerPaused: consumer.producerPaused,
                sender
            });

        } catch (error) {
            console.error('Error creating consumer:', error);
            socket.emit('error', error.message);
        }
    });

    socket.on('resumeConsumer', async ({ consumerId }) => {
        try {
            const consumer = mediasoupServer.getConsumer(socket.id, consumerId);
            await consumer.resume();
        } catch (error) {
            console.error('Error resuming consumer:', error);
            socket.emit('error', error.message);
        }
    });

    socket.on('toggle-video', ({ sender, isVideo }) => {
        console.log("toggle video", sender, isVideo)
        socket.broadcast.emit("toggle-video", { sender, isVideo })
    })

    // Remove the duplicate disconnect handler and enhance the remaining one
    socket.on("disconnect", () => {
        // console.log("User disconnected:", socket.id);

        // Clean up peer data
        const peer = peers.get(socket.id);
        if (peer) {
            // Clean up producers
            peer.producers.forEach(producer => producer.close());

            // Clean up consumers
            peer.consumers.forEach(consumer => consumer.close());

            // Clean up transports
            if (peer.producerTransport) peer.producerTransport.close();
            if (peer.consumerTransport) peer.consumerTransport.close();
        }

        peers.delete(socket.id);
        io.emit('peers', Array.from(peers.keys()));
        mediasoupServer.removeUser(socket.id);
    });


    socket.on("joinRoom", ({ room, data }) => {
        // console.log("Received Room and data: ", room, data)
        let { email, picture, displayName } = data;

        userProfiles.set(email, { picture, displayName });

        if (!usersInRoom.has(room)) {
            usersInRoom.set(room, new Set())
        }
        usersInRoom.get(room).add(email)
        usersToSocket.set(email, socket)

        console.log("Users in the room Set: ", usersInRoom)

        const currentRoom = rooms.get(room) || new Set();

        if (currentRoom.size >= MAX_USERS_PER_ROOM) {
            socket.emit('error', {
                type: 'ROOM_FULL',
                message: 'Room has reached maximum capacity'
            });
            return;
        }

        currentRoom.add(socket.id);
        rooms.set(room, currentRoom);
        socket.join(room);

        // ✅ Send NEW user the profiles of everyone already in the room
        usersInRoom.get(room).forEach((existingEmail) => {
            if (existingEmail !== email && userProfiles.has(existingEmail)) {
                const existingProfile = userProfiles.get(existingEmail);
                socket.emit("userProfile", {
                    email: existingEmail,
                    picture: existingProfile.picture,
                    displayName: existingProfile.displayName
                });
            }
        });

        // ✅ Tell existing users about the NEW user
        socket.to(room).emit("userProfile", { email, picture, displayName });

        socket.to(room).emit("userProfile", { email, picture, displayName });

        const producersInroom = roomToProducers.get(room)
        console.log(`producers in room ${room}: for user: ${email}`, producersInroom)
        producersInroom?.forEach((item) => {
            if (item.sender !== email) {
                const producerId = item.producerId
                console.log("Inside producer", item.sender)
                socket.emit("newProducer", {  // ✅ Send only to the new user
                    producerId: item.producerId,
                    producerSocketId: usersToSocket.get(item.sender)?.id, // Get the producer's socket ID
                    kind: item.kind,
                    sender: item.sender
                });
            }
        })
        socket.to(room).emit("message", {
            email
        });
    });

    socket.on("leaveRoom", ({ room, message }) => {
        let { type, name, time } = message;
        name = `${'friend of ' + name}`;
        socket.leave(room);
        // console.log(`User ${socket.id} left room: ${room}`);
        socket.to(room).emit("message", { type: type, name, text: `user ${socket.id} has left`, time });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        // Find which room this user was in
        const userEmail = [...usersToSocket.entries()]
            .find(([email, sock]) => sock.id === socket.id)?.[0];

        const userRoom = [...rooms.entries()]
            .find(([roomId, members]) => members.has(socket.id))?.[0];

        if (userRoom && userEmail) {
            // Tell everyone in the room this user left
            socket.to(userRoom).emit('userLeft', {
                sender: userEmail
            });

            // Clean up room data
            rooms.get(userRoom).delete(socket.id);
            usersInRoom.get(userRoom)?.delete(userEmail);
            usersToSocket.delete(userEmail);

            // Remove their producers from roomToProducers
            const producers = roomToProducers.get(userRoom);
            if (producers) {
                for (const p of producers) {
                    if (p.sender === userEmail) {
                        producers.delete(p);
                    }
                }
            }
        }

        // existing cleanup
        const peer = peers.get(socket.id);
        if (peer) {
            peer.producers.forEach(producer => producer.close());
            peer.consumers.forEach(consumer => consumer.close());
            if (peer.producerTransport) peer.producerTransport.close();
            if (peer.consumerTransport) peer.consumerTransport.close();
        }
        peers.delete(socket.id);
        io.emit('peers', Array.from(peers.keys()));
        mediasoupServer.removeUser(socket.id);
    });
});