import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { offlineEventMediaAssets } from "../client/src/lib/eventAssets.ts";

const outputPath = resolve(import.meta.dirname, "../client/public/event-media-manifest.json");
await writeFile(outputPath, `${JSON.stringify(offlineEventMediaAssets, null, 2)}\n`, "utf8");
console.log(`Generated ${offlineEventMediaAssets.length} managed event-media entries.`);
