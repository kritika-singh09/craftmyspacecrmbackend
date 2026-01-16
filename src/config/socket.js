// ⚡ WEBSOCKET CONFIGURATION (SOCKET.IO)
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import userregistration from '../models/userregistration.js';

let io;

export const initSocket = (server) => { // ⚡ Initialize Server
    io = new Server(server, {
        cors: {
            origin: "*", // Adjust this for production
            methods: ["GET", "POST"]
        }
    });

    // Authentication middleware for Socket.IO
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userregistration.findById(decoded.id);

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            // Attach user info to socket
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error: ' + error.message));
        }
    });

    io.on('connection', (socket) => {
        const { user } = socket;
        console.log(`User connected: ${user.name} (${user.role}) - ${socket.id}`);

        // Join company-specific room
        if (user.company) {
            const companyRoom = `company_${user.company}`;
            socket.join(companyRoom);
            console.log(`User ${user.name} joined room: ${companyRoom}`);
        }

        // Handle joining project-specific rooms
        socket.on('join_project', (projectId) => {
            const projectRoom = `project_${projectId}`;
            socket.join(projectRoom);
            console.log(`User ${user.name} joined project room: ${projectRoom}`);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${user.name} - ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

/**
 * Emit event to a specific user
 * @param {string} userId 
 * @param {string} event 
 * @param {object} data 
 */
export const emitToUser = (userId, event, data) => {
    // Note: This requires mapping userIds to socketIds if we want to target specific sockets,
    // OR users can join their own private room `user_${userId}` on connection.
    io.to(`user_${userId}`).emit(event, data);
};

/**
 * Emit event to a company room
 * @param {string} companyId 
 * @param {string} event 
 * @param {object} data 
 */
export const emitToCompany = (companyId, event, data) => {
    io.to(`company_${companyId}`).emit(event, data);
};

/**
 * Emit event to a project room
 * @param {string} projectId 
 * @param {string} event 
 * @param {object} data 
 */
export const emitToProject = (projectId, event, data) => {
    io.to(`project_${projectId}`).emit(event, data);
};
