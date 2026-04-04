# Frontstage Pilot v0.1

This experiment is the first training-pilot preparation pass for the frontstage dataset.

## Scope

Primary tasks:

- `text -> FrontstageSemanticPackage`
- `userFeedbackText + previous context -> ProposalFeedbackSignal`

Deferred for later:

- response-plan generation training
- full end-to-end closed-loop generation

## Snapshot

Use the frozen snapshot under:

- `datasets/frontstage/pilot-v0.1/`

Refresh the snapshot with:

```bash
node scripts/prepare-frontstage-pilot.mjs
```

## Baselines

Run:

```bash
node scripts/run-frontstage-package-baseline.mjs
node scripts/run-frontstage-feedback-baseline.mjs
```

Results are written to:

- `experiments/frontstage-pilot/results/package-baseline-v0.1.json`
- `experiments/frontstage-pilot/results/feedback-baseline-v0.1.json`

## Evaluation Style

The pilot uses a leave-one-out retrieval baseline because the dataset is still tiny. The goal is not strong scores; the goal is to expose:

- which supervision layer is already stable enough to learn
- which labels are still too sparse or too noisy
- whether the next data pass should prioritize more package data, more feedback variants, or schema tightening
