import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

let redisClient = null;

export const connectRedis = async () => {
    if (redisClient) return redisClient;

    try {
        redisClient = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
    }
});
console.log(process.env.REDIS_HOST);
console.log(process.env.REDIS_PORT);

        redisClient.on('error', (err) => console.log('Redis Client Error', err));
        
        await redisClient.connect();
        console.log('Redis Connected Successfully!');
        
        return redisClient;
    } catch (error) {
        console.error('Redis Connection Failed:', error);
        redisClient = null;
        return null;
    }
};

export const getRedisClient = () => redisClient;
