// Mongoose reconnects after an established connection is lost, but a failed
// initial connect() rejects and needs a new attempt from the application.
const connectWithRetry = ({ connect, schedule = setTimeout, log = console }) => {
    let stopped = false;
    let timer;
    let attempt = 0;
    const run = async () => {
        if (stopped) return;
        try {
            await connect();
            if (!stopped) log.log('✅ MongoDB connected');
        } catch (error) {
            if (stopped) return;
            const delay = Math.min(30000, 1000 * (2 ** Math.min(attempt++, 5)));
            log.error(`❌ MongoDB connection failed (${error.code || error.name || 'error'}). Retrying in ${delay / 1000}s.`);
            timer = schedule(run, delay);
            timer?.unref?.();
        }
    };
    run();
    return () => { stopped = true; clearTimeout(timer); };
};

module.exports = { connectWithRetry };
