import express from "express";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import apiRoutes from "./routes";

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Root health check endpoint for deployment
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "MealBuilder API is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development"
  });
});

// Setup authentication (optional - only if Replit Auth is configured)
async function initializeServer() {
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