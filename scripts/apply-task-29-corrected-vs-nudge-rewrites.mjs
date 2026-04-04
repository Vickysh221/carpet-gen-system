import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const feedbackPath = path.resolve("datasets/frontstage/feedback-signals/gold-v0.1.jsonl");

function parseJsonl(text) {
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

async function upsertJsonl(filePath, records) {
  const current = parseJsonl(await readFile(filePath, "utf8"));
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const record of records) byId.set(record.id, record);
  const sorted = [...byId.values()].sort((left, right) => left.id.localeCompare(right.id, "en"));
  await writeFile(filePath, `${sorted.map((item) => JSON.stringify(item)).join("\n")}\n`);
}

const source = parseJsonl(await readFile(feedbackPath, "utf8"));
const byId = new Map(source.map((item) => [item.id, item]));
function clone(id) {
  return JSON.parse(JSON.stringify(byId.get(id)));
}

const rewrites = [];

for (const [id, text] of [
  ["fb-004", "竹影还保留在原案里，只把它压轻一点，烟雨那层再往前一点。"],
  ["fb-023", "沿着这版继续收边就好，亮空气往里收一点，不另起新案。"],
  ["fb-024", "还是沿原案往内收一点，只把将下未下那层空气压轻，不另起别案。"],
  ["fb-025", "先沿这一版细调，空气多一点、叶感轻一点，不另起新案。"],
]) {
  const x = clone(id);
  x.sourceRunner = "manual-curation-task-29";
  x.input.userFeedbackText = text;
  x.output.proposalFeedbackSignal.sourceText = text;
  x.notes = ["Task 29 rewrite: same-domain nudge now uses original-plan refinement language instead of switch-language overlap."];
  rewrites.push(x);
}

for (const [id, text] of [
  ["fb-003", "另起一案吧，这次不要海边那组了，直接改走草本花香那边。"],
  ["fb-016", "竹影这一支先作废，另起成纯雨前空气那案，不再留 trace。"],
  ["fb-019", "上一组 coastal 先整组作废，另起成下雨前压着的空气那一案。"],
  ["fb-020", "上一组 moist 先整组作废，另起成靠海亮白空气那一案。"],
  ["fb-021", "这组 mixed 先整组作废，另起 pure coastal 那一案，只留亮白空气。"],
]) {
  const x = clone(id);
  x.sourceRunner = "manual-curation-task-29";
  x.input.userFeedbackText = text;
  x.output.proposalFeedbackSignal.sourceText = text;
  x.notes = ["Task 29 rewrite: corrected-domain now uses abandon-previous-group language instead of adjustment language."];
  rewrites.push(x);
}

await upsertJsonl(feedbackPath, rewrites);
console.log(`Rewrote ${rewrites.length} feedback records.`);
