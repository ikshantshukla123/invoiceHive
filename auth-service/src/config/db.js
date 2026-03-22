import mongoose from "mongoose";
import { MONGO_URI } from "./env.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1); // Kill the service — nothing works without DB
  }
};