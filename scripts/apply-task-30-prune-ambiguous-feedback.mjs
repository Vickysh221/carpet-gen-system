import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const feedbackPath = path.resolve("datasets/frontstage/feedback-signals/gold-v0.1.jsonl");
const pruneIds = new Set(["fb-023", "fb-024", "fb-025"]);

const lines = (await readFile(feedbackPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
const kept = lines.filter((item) => !pruneIds.has(item.id)).sort((left, right) => left.id.localeCompare(right.id, "en"));

await writeFile(feedbackPath, `${kept.map((item) => JSON.stringify(item)).join("\n")}\n`);
console.log(`Pruned ${lines.length - kept.length} ambiguous feedback records.`);
