import express, {
  Express,
  Request,
  Response,
} from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler";
import { routes } from "./routes";
import { db } from "./services/database/connect";

// Load environment variables first
dotenv.config();

// Increase Node.js memory limit
// Add this line to fix memory issues
const maxMemory = process.env.NODE_OPTIONS || "--max-old-space-size=2048";
process.env.NODE_OPTIONS = maxMemory;

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 10000;

// Connect to database
db._connect();

// Set up middleware
app.use(bodyParser.json({ limit: '10mb' })); // Increase JSON payload limit
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ["https://report-68b6a.web.app/"] // <-- THÊM DOMAIN NÀY VÀO ĐÂY
    : "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Routes
app.use(routes);
app.use(errorHandler);

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server running");
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running on port ${port}`);
});