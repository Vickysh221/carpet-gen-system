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

{
  const x = clone("fb-008");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "就定第一种，不做混合，只把香气再散开一点。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: selection sample now explicitly says do not blend."];
  rewrites.push(x);
}
{
  const x = clone("fb-009");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "不要单选，我要把第一种和第二种直接揉成一案，颜色留着，植物影子再少一点。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: blend sample now explicitly says do not single-select."];
  rewrites.push(x);
}
{
  const x = clone("fb-010");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "就按第一种走，不混第三种，味道更连起来一点，叶感再轻一点。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: mixed select sample now explicitly rejects blending."];
  rewrites.push(x);
}
{
  const x = clone("fb-011");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "不要单选，我就是要把第一种和第三种拼在一起，空气别丢，香气往前一点。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: mixed blend sample now explicitly states two-proposal composition."];
  rewrites.push(x);
}
{
  const x = clone("fb-013");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "就留第一种，不要揉第二种，花叶那层再轻一点，空一点更好。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: botanical select sample now explicitly rejects blend."];
  rewrites.push(x);
}
{
  const x = clone("fb-014");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "不要定成单一方案，我要把两种一起留，先有呼吸感，再带一点花叶意向。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: botanical blend sample now explicitly rejects single-option selection."];
  rewrites.push(x);
}
{
  const x = clone("fb-017");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "不要单选，我要把第一种和第三种揉成同一版，通透要在，但别像海报那么满。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: coastal blend sample now explicitly signals two-proposal merge."];
  rewrites.push(x);
}
{
  const x = clone("fb-018");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "不要只定一种，我要把第一种和第三种叠在一起，压低感留着，但别太像真的要下。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: moist blend sample now explicitly signals blend."];
  rewrites.push(x);
}
{
  const x = clone("fb-019");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "我要直接换域，不在 coastal 这组里调了，改成下雨前那种压着的空气，海边亮空气整组退出。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: corrected-domain sample now explicitly says switch domain and exit current group."];
  rewrites.push(x);
}
{
  const x = clone("fb-020");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "我要直接换域，不在 moist 这组里细调了，改成靠海的亮白空气，湿意整组退出。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: corrected-domain sample now explicitly says switch domain and exit current group."];
  rewrites.push(x);
}
{
  const x = clone("fb-021");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "我要直接换成 pure coastal，不是在 mixed 这组里减叶感，叶痕和这组 mixed 都先退出。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: mixed->pure corrected-domain now explicitly says leave the mixed group."];
  rewrites.push(x);
}
{
  const x = clone("fb-022");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "我要把第二种和第三种混成一版，不单定某一个，亮还要在，但更空一点，别长成海景。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: coastal blend sample now explicitly signals blend rather than nudge."];
  rewrites.push(x);
}
{
  const x = clone("fb-023");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "不换方案也不混别的，就在这个 coastal 方向里微调，亮空气再收一点，别那么铺。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: coastal same-domain nudge now explicitly rejects blend and domain change."];
  rewrites.push(x);
}
{
  const x = clone("fb-024");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "不换域也不混别案，就在这层将下未下的空气里微调，再轻一点。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: moist same-domain nudge now explicitly rejects blend and domain change."];
  rewrites.push(x);
}
{
  const x = clone("fb-025");
  x.sourceRunner = "manual-curation-task-28";
  x.input.userFeedbackText = "不换域，也不是混方案，只在这组 mixed 里微调，空气多一点，叶感再轻一点。";
  x.output.proposalFeedbackSignal.sourceText = x.input.userFeedbackText;
  x.notes = ["Task 28 rewrite: mixed same-domain nudge now explicitly rejects blend and domain change."];
  rewrites.push(x);
}

await upsertJsonl(feedbackPath, rewrites);
console.log(`Rewrote ${rewrites.length} feedback records.`);
