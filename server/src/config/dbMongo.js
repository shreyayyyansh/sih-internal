import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/urbanconnect';
        const conn = await mongoose.connect(mongoUri);

        console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[MongoDB] Error: ${error.message}`);
        // Do not exit process in case Firebase is still running fine for other modules
    }
};

export default connectDB;
