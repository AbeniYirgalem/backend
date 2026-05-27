import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  mongoose.set("bufferCommands", false);
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  return mongoose.connection;
}
