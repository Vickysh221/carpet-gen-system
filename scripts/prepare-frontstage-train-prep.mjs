import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".");
const sourceRoot = path.join(root, "datasets/frontstage");
const freezeRoot = path.join(sourceRoot, "train-prep-v0.1");

const files = {
  package: "package/gold-v0.1.jsonl",
  responsePlan: "response-plan/gold-v0.1.jsonl",
  feedbackSignals: "feedback-signals/gold-v0.1.jsonl",
  closedLoop: "closed-loop/gold-v0.1.jsonl",
};

const splits = {
  package: {
    trainIds: [
      "pkg-001","pkg-002","pkg-003","pkg-004","pkg-005","pkg-006","pkg-007","pkg-008",
      "pkg-010","pkg-011","pkg-012","pkg-013","pkg-015","pkg-017","pkg-019","pkg-020",
      "pkg-022","pkg-023","pkg-024","pkg-026","pkg-027","pkg-028","pkg-029",
    ],
    validationIds: ["pkg-009","pkg-014","pkg-016","pkg-018","pkg-021","pkg-025"],
  },
  feedbackSignals: {
    trainIds: [
      "fb-001","fb-002","fb-003","fb-005","fb-006","fb-007","fb-008","fb-010",
      "fb-012","fb-013","fb-014","fb-015","fb-016","fb-017","fb-018","fb-020",
    ],
    validationIds: ["fb-004","fb-009","fb-011","fb-019","fb-021","fb-022"],
  },
  closedLoop: {
    trainingTarget: false,
    regressionEvalIds: ["cl-001","cl-002","cl-003","cl-004","cl-005","cl-006","cl-007","cl-008","cl-009","cl-010"],
  },
};

await mkdir(path.join(freezeRoot, "package"), { recursive: true });
await mkdir(path.join(freezeRoot, "response-plan"), { recursive: true });
await mkdir(path.join(freezeRoot, "feedback-signals"), { recursive: true });
await mkdir(path.join(freezeRoot, "closed-loop"), { recursive: true });

await copyFile(path.join(sourceRoot, files.package), path.join(freezeRoot, files.package));
await copyFile(path.join(sourceRoot, files.responsePlan), path.join(freezeRoot, files.responsePlan));
await copyFile(path.join(sourceRoot, files.feedbackSignals), path.join(freezeRoot, files.feedbackSignals));
await copyFile(path.join(sourceRoot, files.closedLoop), path.join(freezeRoot, files.closedLoop));
await copyFile(path.join(sourceRoot, "schema-v0.1.json"), path.join(freezeRoot, "schema-v0.1.json"));
await copyFile(path.join(sourceRoot, "schema-v0.2.json"), path.join(freezeRoot, "schema-v0.2.json"));

const manifest = {
  snapshotVersion: "train-prep-v0.1",
  createdAt: new Date().toISOString(),
  sourceGoldVersion: "frontstage gold v0.1 stabilized through Task 30",
  readinessCheckpoint: "docs/training-readiness-checkpoint-after-stabilization-pass-v0.1.md",
  linkedPilotSnapshot: "datasets/frontstage/pilot-v0.1/manifest-v0.1.json",
  schema: {
    legacy: "schema-v0.1.json",
    packageWithAuxiliarySupervision: "schema-v0.2.json",
  },
  files: {
    package: { path: "package/gold-v0.1.jsonl", count: 29 },
    responsePlan: { path: "response-plan/gold-v0.1.jsonl", count: 6 },
    feedbackSignals: { path: "feedback-signals/gold-v0.1.jsonl", count: 22 },
    closedLoop: { path: "closed-loop/gold-v0.1.jsonl", count: 10 },
  },
  baselineRoles: {
    packageNearestNeighbor: "coarse lexical boundary regression check for package learnability",
    feedbackNearestNeighbor: "weak retrieval-style continuity baseline retained for historical comparison only",
    feedbackBoundaryBaseline: "primary feedback task-structure separability gate for blend vs nudge vs corrected-domain",
  },
  notes: [
    "Baseline result files are generated on the refreshed pilot-v0.1 slice.",
    "pilot-v0.1 and train-prep-v0.1 are synchronized from the same current gold files during cleanup and training preparation.",
  ],
};

await writeFile(path.join(freezeRoot, "manifest-v0.1.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(freezeRoot, "splits-v0.1.json"), `${JSON.stringify(splits, null, 2)}\n`);
await writeFile(
  path.join(freezeRoot, "VERSION.txt"),
  "train-prep-v0.1\nFrozen package/feedback snapshot for formal training preparation after stabilization.\n",
);

console.log(`Prepared ${freezeRoot}`);
