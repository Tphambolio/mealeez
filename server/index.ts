import express from "express";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import apiRoutes from "./routes";
import { setupAuth } from "./replitAuth";

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

// Setup authentication (must be before routes)
async function initializeServer() {
  try {
    await setupAuth(app);
    console.log("✓ Authentication configured");
  } catch (error) {
    console.warn("⚠ Authentication setup skipped:", error instanceof Error ? error.message : "Unknown error");
    console.warn("  App will run without auth - set REPLIT_DOMAINS and REPL_ID to enable");
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

initializeServer().catch(console.error);