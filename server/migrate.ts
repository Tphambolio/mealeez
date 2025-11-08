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

    const migrationsDir = path.join(__dirname, "..", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
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

      console.log(`✓ Migration ${file} applied successfully`);
    }

    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
