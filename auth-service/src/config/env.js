import dotenv from 'dotenv';
dotenv.config();

console.log('Loaded environment variables:', {
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
});

export const {
    PORT,
    MONGO_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    GITHUB_CALLBACK_URL,
    REDIS_URL,
} = process.env;    
