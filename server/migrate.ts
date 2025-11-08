import { sql } from "drizzle-orm";
import { db } from "./db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log("Running database migrations...");

    // Create migrations tracking table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of applied migrations
    const appliedMigrations = await db.execute(sql`
      SELECT name FROM _migrations
    `);
    const appliedSet = new Set(
      appliedMigrations.rows.map((row: any) => row.name)
    );

    const migrationsDir = path.join(__dirname, "..", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      // Skip if already applied
      if (appliedSet.has(file)) {
        console.log(`⊙ Migration ${file} already applied, skipping`);
        continue;
      }

      console.log(`Applying migration: ${file}`);
      const migrationSQL = fs.readFileSync(
        path.join(migrationsDir, file),
        "utf-8"
      );

      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        await db.execute(sql.raw(statement));
      }

      // Mark migration as applied
      await db.execute(sql`
        INSERT INTO _migrations (name) VALUES (${file})
      `);

      console.log(`✓ Migration ${file} applied successfully`);
    }

    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
