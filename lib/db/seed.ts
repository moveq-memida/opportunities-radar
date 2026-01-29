import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db, sources } from "./client";
import { defaultSources } from "../sources";

async function seed() {
  console.log("Seeding database...");

  // Insert default sources
  for (const source of defaultSources) {
    try {
      await db.insert(sources).values(source).onConflictDoNothing();
      console.log(`Inserted source: ${source.name}`);
    } catch (error) {
      console.error(`Failed to insert ${source.name}:`, error);
    }
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
