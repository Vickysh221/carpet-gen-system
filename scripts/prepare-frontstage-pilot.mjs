import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".");
const sourceRoot = path.join(root, "datasets/frontstage");
const pilotRoot = path.join(sourceRoot, "pilot-v0.1");

const files = {
  package: "package/gold-v0.1.jsonl",
  responsePlan: "response-plan/gold-v0.1.jsonl",
  feedbackSignals: "feedback-signals/gold-v0.1.jsonl",
  closedLoop: "closed-loop/gold-v0.1.jsonl",
};

async function countJsonlLines(filePath) {
  const content = (await readFile(filePath, "utf8")).trim();
  return content ? content.split("\n").length : 0;
}

await mkdir(path.join(pilotRoot, "package"), { recursive: true });
await mkdir(path.join(pilotRoot, "response-plan"), { recursive: true });
await mkdir(path.join(pilotRoot, "feedback-signals"), { recursive: true });
await mkdir(path.join(pilotRoot, "closed-loop"), { recursive: true });

await copyFile(path.join(sourceRoot, files.package), path.join(pilotRoot, files.package));
await copyFile(path.join(sourceRoot, files.responsePlan), path.join(pilotRoot, files.responsePlan));
await copyFile(path.join(sourceRoot, files.feedbackSignals), path.join(pilotRoot, files.feedbackSignals));
await copyFile(path.join(sourceRoot, files.closedLoop), path.join(pilotRoot, files.closedLoop));
await copyFile(path.join(sourceRoot, "schema-v0.1.json"), path.join(pilotRoot, "schema-v0.1.json"));
await copyFile(path.join(sourceRoot, "schema-v0.2.json"), path.join(pilotRoot, "schema-v0.2.json"));

const manifest = {
  snapshotVersion: "pilot-v0.1",
  createdAt: new Date().toISOString(),
  sourceGoldVersion: "frontstage gold v0.1 stabilized through Task 30",
  alignedTrainPrepSnapshot: "datasets/frontstage/train-prep-v0.1/manifest-v0.1.json",
  schema: {
    legacy: "schema-v0.1.json",
    packageWithAuxiliarySupervision: "schema-v0.2.json",
  },
  files: {
    package: {
      path: "package/gold-v0.1.jsonl",
      count: await countJsonlLines(path.join(pilotRoot, files.package)),
    },
    responsePlan: {
      path: "response-plan/gold-v0.1.jsonl",
      count: await countJsonlLines(path.join(pilotRoot, files.responsePlan)),
    },
    feedbackSignals: {
      path: "feedback-signals/gold-v0.1.jsonl",
      count: await countJsonlLines(path.join(pilotRoot, files.feedbackSignals)),
    },
    closedLoop: {
      path: "closed-loop/gold-v0.1.jsonl",
      count: await countJsonlLines(path.join(pilotRoot, files.closedLoop)),
    },
  },
  pilotTasks: [
    {
      id: "package-task",
      input: ["inputText"],
      output: ["interpretationDomain", "domainConfidence", "interpretationHandles", "compositionAxes", "misleadingPaths"],
      evaluation: "leave-one-out retrieval baseline",
    },
    {
      id: "feedback-task",
      input: ["userFeedbackText", "previousPackage", "previousResponsePlan"],
      output: ["ProposalFeedbackSignal"],
      evaluation: "leave-one-out retrieval baseline",
    },
  ],
};

await writeFile(path.join(pilotRoot, "manifest-v0.1.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  path.join(pilotRoot, "VERSION.txt"),
  "pilot-v0.1\nThis snapshot is frozen for the first package/feedback training pilot.\n",
);

console.log(`Prepared ${pilotRoot}`);
