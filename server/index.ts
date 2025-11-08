import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { setupVite, serveStatic } from "./vite";
import apiRoutes from "./routes";
import { storage } from "./storage";

const app = express();
const server = createServer(app);

// Setup WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received WebSocket message:', data);

      // Broadcast to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send initial connection message
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connection established' }));
});

// Make WebSocket server available to routes for broadcasting
export { wss };

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for deployment monitoring
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "MealBuilder API is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development"
  });
});

// Setup authentication (optional - only if Replit Auth is configured)
async function initializeServer() {
  // Ensure anonymous user exists for unauthenticated access
  try {
    await storage.upsertUser({
      id: 'anonymous',
      email: null,
      firstName: 'Anonymous',
      lastName: 'User',
    });
    console.log("✓ Anonymous user initialized");
  } catch (error) {
    console.warn("⚠ Failed to initialize anonymous user:", error instanceof Error ? error.message : "Unknown error");
  }

  // Only setup Replit Auth if explicitly configured
  if (process.env.REPLIT_DOMAINS && process.env.REPL_ID) {
    try {
      const { setupAuth } = await import("./replitAuth.js");
      await setupAuth(app);
      console.log("✓ Replit Authentication configured");
    } catch (error) {
      console.warn("⚠ Replit Authentication setup failed:", error instanceof Error ? error.message : "Unknown error");
      console.warn("  Continuing without authentication");
    }
  } else {
    console.log("ℹ Running without authentication (set REPLIT_DOMAINS and REPL_ID to enable Replit Auth)");
  }

  // Register API routes
  app.use(apiRoutes);

  const PORT = parseInt(process.env.PORT || "5000", 10);

  // Setup Vite in development or serve static files in production
  if (process.env.NODE_ENV === "development") {
    setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✓ Server running on http://0.0.0.0:${PORT}`);
  });
}

initializeServer().catch(console.error);