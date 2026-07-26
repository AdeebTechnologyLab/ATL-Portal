const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const cloudinary = require('cloudinary').v2;
const http = require('http');
const { sendClassTimeReminders } = require('./utils/classTimeReminders');

// Load environment variables
dotenv.config();
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

const { isEmailConfigured } = require('./utils/email');
if (!isEmailConfigured()) {
    const brevoMissing = process.env.BREVO_API_KEY && !process.env.EMAIL_FROM && !process.env.EMAIL_USER;
    if (brevoMissing) {
        console.warn('⚠️ BREVO_API_KEY set but EMAIL_FROM missing — also set EMAIL_FROM (verified Brevo sender) in env.');
    } else {
        console.warn('⚠️ Neither BREVO_API_KEY nor EMAIL_USER+EMAIL_PASS set — forgot-password emails will not send.');
    }
} else if (process.env.BREVO_API_KEY) {
    console.log('✅ Brevo API key detected — password reset emails will use Brevo (sender: ' + (process.env.EMAIL_FROM || process.env.EMAIL_USER) + ').');
} else if (/your_gmail|your_16_char|app_password/i.test(process.env.EMAIL_USER + process.env.EMAIL_PASS)) {
    console.warn('⚠️ Replace placeholder EMAIL_USER / EMAIL_PASS in backend/.env with a real Gmail App Password.');
}

if (
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REDIRECT_URI
) {
    console.log('Google Drive assignment uploads are configured.');
} else {
    console.warn('Google Drive assignment uploads are not configured.');
}

// Validate environment variables
console.log('\n========================================');
console.log('🔧 LMS BACKEND - Starting...');
console.log('========================================\n');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const feeRoutes = require('./routes/fees');
const attendanceRoutes = require('./routes/attendance');
const assignmentRoutes = require('./routes/assignments');
const certificateRoutes = require('./routes/certificates');
const taskRoutes = require('./routes/tasks');
const dailyTasksRoutes = require('./routes/dailyTasks');
const notificationRoutes = require('./routes/notifications');
const userNotificationRoutes = require('./routes/userNotifications');
const chatRoutes = require('./routes/chat');
const statsRoutes = require('./routes/stats');
const settingsRoutes = require('./routes/settings');
const liveClassRoutes = require('./routes/liveClass');
const directoryRoutes = require('./routes/directory');
const financeRoutes = require('./routes/finance');
const reportRoutes = require('./routes/reports');
const registrationPageRoutes = require('./routes/registrationPages');
const googleDriveRoutes = require('./routes/googleDrive');

// Import attendance lock function
const { lockTodayAttendance } = require('./controllers/attendanceController');

// Import installment generation functions
const { runInstallmentJob } = require('./scripts/generateInstallments');

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const staticOrigins = [
    'https://lms-adeeb-technology-lab.vercel.app',
    'https://lms-adeeb-technology-lab.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

if (process.env.CLIENT_URL) {
    staticOrigins.push(process.env.CLIENT_URL.replace(/\/$/, ''));
}

const corsOptions = {
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }
        if (
            staticOrigins.includes(origin) ||
            /^https:\/\/[\w-]+-[\w-]+-adeeb-technology-lab\.vercel\.app$/.test(origin) ||
            /^https:\/\/lms-adeeb-technology-lab[\w-]*\.vercel\.app$/.test(origin) ||
            /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const io = require('socket.io')(server, {
    cors: corsOptions
});

app.set('io', io);

// Track active users
const activeUserSockets = new Map(); // socket.id -> userId

io.on('connection', (socket) => {
    console.log('🔌 New client connected');

    socket.on('join_chat', async (userId) => {
        const room = userId.toString();
        socket.join(room);
        socket.userId = room; // Store user identifier on socket
        activeUserSockets.set(socket.id, room);
        
        // Broadcast unique active users count
        const uniqueUsers = new Set(activeUserSockets.values()).size;
        io.emit('active_users_count', uniqueUsers);
        
        console.log(`👤 User joined personal chat room: ${room} | Active: ${uniqueUsers}`);

        // Update status in real-time
        try {
            const User = require('./models/User');
            const user = await User.findByIdAndUpdate(userId, { lastSeen: new Date() }, { new: true });
            if (user) {
                io.emit('user_status_update', {
                    userId: user._id.toString(),
                    lastSeen: user.lastSeen
                });
            }
        } catch (err) {
            console.error('Error updating lastSeen on join_chat:', err);
        }
    });

    socket.on('heartbeat', async (userId) => {
        try {
            const User = require('./models/User');
            const user = await User.findByIdAndUpdate(userId, { lastSeen: new Date() }, { new: true });
            if (user) {
                io.emit('user_status_update', {
                    userId: user._id.toString(),
                    lastSeen: user.lastSeen
                });
            }
        } catch (err) {
            console.error('Error in heartbeat socket event:', err);
        }
    });

    socket.on('send_global_message', async (data) => {
        const targetRoom = data.recipientId.toString();
        const senderRoom = data.senderId.toString();

        console.log(`💬 Global Message from ${senderRoom} to ${targetRoom}: ${data.text}`);

        // Ensure recipient is in room if connected
        const socketsInRoom = io.sockets.adapter.rooms.get(targetRoom);
        if (!socketsInRoom || socketsInRoom.size === 0) {
            const allSockets = await io.fetchSockets();
            for (const s of allSockets) {
                if (s.userId === targetRoom) {
                    s.join(targetRoom);
                    console.log(`🔄 Auto-joined socket ${s.id} to room ${targetRoom}`);
                }
            }
        }

        // Emit to recipient
        io.to(targetRoom).emit('new_global_message', data);
        // Emit back to sender
        io.to(senderRoom).emit('new_global_message', data);
    });

    // --- CUSTOM VIDEO CLASSROOM SIGNALING ---
    const roomScreenSharers = new Map();
    const roomRaisedHands = new Map();

    const clearRaisedHand = (roomId, socketId) => {
        const set = roomRaisedHands.get(roomId);
        if (!set?.has(socketId)) return;
        set.delete(socketId);
        if (set.size === 0) roomRaisedHands.delete(roomId);
        io.to(roomId).emit('classroom_hand_raise', { socketId, raised: false });
    };

    const broadcastRoomUsers = (roomId) => {
        const usersInRoom = [];
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
            for (const socketId of roomSockets) {
                const s = io.sockets.sockets.get(socketId);
                if (s && s.userDetails) {
                    usersInRoom.push({
                        socketId: socketId,
                        userDetails: s.userDetails
                    });
                }
            }
        }
        io.to(roomId).emit('room_users_update', usersInRoom);
    };

    socket.on('join_classroom', (roomId, userDetails) => {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.userDetails = userDetails; // { id, name, photo, role }
        
        console.log(`📡 User ${userDetails.name} joined classroom: ${roomId}`);
        
        // Notify others to start handshake
        socket.to(roomId).emit('user_joined_classroom', {
            socketId: socket.id,
            userDetails: userDetails
        });

        // Send existing users to the new joiner ONLY
        const existingUsers = [];
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
            for (const socketId of roomSockets) {
                if (socketId !== socket.id) {
                    const s = io.sockets.sockets.get(socketId);
                    if (s && s.userDetails) {
                        existingUsers.push({
                            socketId: socketId,
                            userDetails: s.userDetails
                        });
                    }
                }
            }
        }
        socket.emit('existing_classroom_users', existingUsers);

        const activeSharer = roomScreenSharers.get(roomId);
        if (activeSharer) {
            socket.emit('classroom_screen_share', { socketId: activeSharer, active: true });
        }

        const raisedInRoom = roomRaisedHands.get(roomId);
        if (raisedInRoom) {
            for (const raisedSocketId of raisedInRoom) {
                if (raisedSocketId === socket.id) continue;
                const rs = io.sockets.sockets.get(raisedSocketId);
                if (rs?.userDetails) {
                    socket.emit('classroom_hand_raise', {
                        socketId: raisedSocketId,
                        raised: true,
                        userDetails: rs.userDetails,
                    });
                }
            }
        }

        // Broadcast updated user list to everyone for the participant list UI
        broadcastRoomUsers(roomId);
    });

    socket.on('classroom_signal', (data) => {
        // data: { to: socketId, signal, from: socketId, userDetails }
        io.to(data.to).emit('classroom_signal', {
            signal: data.signal,
            from: socket.id,
            userDetails: data.userDetails
        });
    });

    socket.on('classroom_message', (data) => {
        io.to(data.roomId).emit('classroom_message', data);
    });

    socket.on('classroom_media_state', (data) => {
        socket.to(data.roomId).emit('classroom_media_state', {
            socketId: socket.id,
            isMuted: data.isMuted,
            isVideoOff: data.isVideoOff
        });
    });

    socket.on('classroom_hand_raise', (data) => {
        const roomId = data?.roomId || socket.roomId;
        if (!roomId) return;

        if (!roomRaisedHands.has(roomId)) roomRaisedHands.set(roomId, new Set());
        const set = roomRaisedHands.get(roomId);

        if (data.raised) {
            set.add(socket.id);
        } else {
            set.delete(socket.id);
            if (set.size === 0) roomRaisedHands.delete(roomId);
        }

        io.to(roomId).emit('classroom_hand_raise', {
            socketId: socket.id,
            raised: !!data.raised,
            userDetails: socket.userDetails,
        });
    });

    socket.on('classroom_screen_share', (data) => {
        if (!data?.roomId) return;
        if (data.active) {
            roomScreenSharers.set(data.roomId, socket.id);
        } else if (roomScreenSharers.get(data.roomId) === socket.id) {
            roomScreenSharers.delete(data.roomId);
        }
        socket.to(data.roomId).emit('classroom_screen_share', {
            socketId: socket.id,
            active: !!data.active
        });
    });

    socket.on('leave_classroom', (roomId) => {
        if (!roomId) return;
        if (roomScreenSharers.get(roomId) === socket.id) {
            roomScreenSharers.delete(roomId);
            socket.to(roomId).emit('classroom_screen_share', { socketId: socket.id, active: false });
        }
        clearRaisedHand(roomId, socket.id);
        socket.leave(roomId);
        socket.to(roomId).emit('user_left_classroom', socket.id);
        if (socket.roomId === roomId) {
            socket.roomId = null;
            socket.userDetails = null;
        }
        setTimeout(() => broadcastRoomUsers(roomId), 300);
    });

    socket.on('teacher_control', (data) => {
        const roomId = data.roomId;
        if (!roomId) return;

        if (data.action === 'end_class') {
            io.to(roomId).emit('class_ended_by_teacher');
            return;
        }

        if (data.action === 'kick_user' && data.targetSocketId) {
            io.to(data.targetSocketId).emit('teacher_action', { action: 'kicked' });
            const target = io.sockets.sockets.get(data.targetSocketId);
            if (target?.roomId) {
                target.leave(target.roomId);
                io.to(target.roomId).emit('user_left_classroom', data.targetSocketId);
                setTimeout(() => broadcastRoomUsers(target.roomId), 300);
            }
            return;
        }

        if (data.action === 'mute_user' && data.targetSocketId) {
            io.to(data.targetSocketId).emit('teacher_action', { action: 'force_mute' });
            return;
        }

        io.to(data.targetSocketId || roomId).emit('teacher_action', data);
    });

    socket.on('disconnect', () => {
        if (socket.roomId) {
            const roomId = socket.roomId;
            if (roomScreenSharers.get(roomId) === socket.id) {
                roomScreenSharers.delete(roomId);
                socket.to(roomId).emit('classroom_screen_share', { socketId: socket.id, active: false });
            }
            clearRaisedHand(roomId, socket.id);
            io.to(roomId).emit('user_left_classroom', socket.id);
            setTimeout(() => broadcastRoomUsers(roomId), 500);
        }
        activeUserSockets.delete(socket.id);
        const uniqueUsers = new Set(activeUserSockets.values()).size;
        io.emit('active_users_count', uniqueUsers);
        console.log('🔌 Client disconnected | Active:', uniqueUsers);
    });
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
    req.setTimeout(30000);
    res.setTimeout(30000);
    next();
});

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const runDatabaseTask = async (label, task) => {
    if (!isDatabaseConnected()) {
        console.log(`Skipping ${label} because MongoDB is not connected.`);
        return;
    }

    try {
        await task();
    } catch (error) {
        console.error(`${label} failed:`, error);
    }
};

// Connect to MongoDB with optimized settings for serverless/deployment
if (!mongoUri) {
    console.error('Missing MongoDB connection string. Create backend/.env and set MONGODB_URI (or MONGO_URI).');
    console.error('Example: copy backend/.env.example to backend/.env and restart the server.');
} else {
    mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
        readPreference: 'primaryPreferred',
        w: 'majority'
    })
        .then(() => console.log('✅ MongoDB connected'))
        .catch((err) => console.error('❌ MongoDB error:', err.message));
}

// Keep MongoDB connection alive
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected. Reconnecting...');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/daily-tasks', dailyTasksRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user-notifications', userNotificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tests', require('./routes/tests'));
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/live-class', liveClassRoutes);
app.use('/api/directory', directoryRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/registration-pages', registrationPageRoutes);
app.use('/api/google-drive', googleDriveRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', socket: !!io });
});

// Attendance auto-save & lock cron job - Runs daily at 12:00 AM Pakistan Time (PKT)
cron.schedule('0 0 * * *', async () => {
    console.log('🕛 Midnight PKT cron triggered - Auto-saving attendance...');
    await runDatabaseTask('Daily attendance auto-save', async () => {
        const result = await lockTodayAttendance();
        console.log(`✅ Daily attendance auto-save completed: ${result.processedCount} courses processed, ${result.createdCount} new records`);
    });
}, {
    timezone: "Asia/Karachi"
});

// Installment generation cron job - Runs daily at 1:00 AM PKT
cron.schedule('0 1 * * *', async () => {
    await runDatabaseTask('Daily installment job', async () => {
        console.log('🔄 Running daily installment job...');
        await runInstallmentJob(io);
        console.log('✅ Daily installment job completed');
    });
}, {
    timezone: "Asia/Karachi"
});

// Live Class auto-cleanup cron job - Runs every minute
cron.schedule('* * * * *', async () => {
    await runDatabaseTask('Live class auto-cleanup', async () => {
        const LiveClass = require('./models/LiveClass');
        const now = new Date();
        const classesWithTimer = await LiveClass.find({
            isActive: true,
            autoEndMinutes: { $ne: null }
        });

        const toDelete = classesWithTimer.filter(lc => {
            const expiresAt = new Date(lc.startTime.getTime() + lc.autoEndMinutes * 60 * 1000);
            return now >= expiresAt;
        });

        if (toDelete.length > 0) {
            console.log(`🧹 Auto-cleaning ${toDelete.length} expired live classes...`);
            for (const lc of toDelete) {
                await lc.deleteOne();
                if (io) io.emit('live_class_ended', { id: lc._id.toString() });
            }
        }
    });
});

// Assigned class-time reminders - checked every minute in Pakistan time.
cron.schedule('* * * * *', async () => {
    await runDatabaseTask('Class time reminders', async () => {
        const result = await sendClassTimeReminders(io);
        if (result.sent > 0) {
            console.log(`🔔 Sent ${result.sent} class time reminder(s)`);
        }
    });
}, {
    timezone: 'Asia/Karachi'
});

// 404 handler for unmatched routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        debug: {
            method: req.method,
            originalUrl: req.originalUrl
        }
    });
});

// Run installment job once on server startup (after 5 seconds delay)
setTimeout(async () => {
    await runDatabaseTask('Startup installment check', async () => {
        console.log('🔄 Running startup installment check...');
        await runInstallmentJob(io);
    });
}, 5000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Final error handler to prevent CORS issues on crashes
app.use((err, req, res, next) => {
    console.error('🔥 Global Server Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

module.exports = app;
