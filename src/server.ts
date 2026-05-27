import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createSocketServer } from "./services/socket-service.js";

const app = express();
const server = http.createServer(app);
const io = createSocketServer(server);
app.set("io", io);

// CORS configuration: allow frontend URLs from env plus localhost for development.
const allowedOrigins = new Set(env.allowedOrigins);

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // allow requests with no origin (like server-to-server or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("CORS policy: Origin not allowed"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "OK" });
});

// Mount routes under both `/api` and root so clients calling either `/api/auth` or `/auth` work.
app.use("/api", routes);
app.use("/", routes);
app.use(errorHandler);

connectDB()
  .then(() => {
    server.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${env.port}`);
      // eslint-disable-next-line no-console
      console.log(
        `Allowed CORS origins: ${env.allowedOrigins.join(", ") || "(none)"}`,
      );
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exit(1);
  });
