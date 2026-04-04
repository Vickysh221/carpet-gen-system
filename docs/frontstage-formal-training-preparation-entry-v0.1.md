# Frontstage Formal Training Preparation Entry v0.1

Date: 2026-04-05

## 1. Scope

This entry starts formal training preparation for:

- `package`
- `feedback-signals`

It does **not** start formal training preparation for:

- `response-plan generation`

That target remains deferred.

---

## 2. Frozen Snapshot

The active frozen snapshot for training preparation is:

- `datasets/frontstage/train-prep-v0.1/manifest-v0.1.json`

The baseline result files remain under `experiments/frontstage-pilot/**`, but they are evaluated on `datasets/frontstage/pilot-v0.1/**`, which has been refreshed to the same gold slice as this frozen train-prep snapshot.

Snapshot counts:

- package: `29`
- response-plan: `6`
- feedback-signals: `22`
- closed-loop: `10`

Supporting checkpoint:

- `docs/training-readiness-checkpoint-after-stabilization-pass-v0.1.md`

Supporting coverage note:

- `datasets/frontstage/ANCHOR-COVERAGE-NOTES-v0.1.md`

---

## 3. Split Definition

The split definition for this frozen snapshot lives at:

- `datasets/frontstage/train-prep-v0.1/splits-v0.1.json`

Current split policy:

- package:
  - train: `23`
  - validation: `6`
- feedback-signals:
  - train: `16`
  - validation: `6`
- closed-loop:
  - not a direct training target
  - kept as regression / continuation evaluation support

---

## 4. Dual Baseline Role

Two baselines are retained, but they do different jobs.

### A. Nearest-neighbor baseline

Files:

- `experiments/frontstage-pilot/results/package-baseline-v0.1.json`
- `experiments/frontstage-pilot/results/feedback-baseline-v0.1.json`

Use it for:

- coarse lexical regression checks
- continuity with earlier pilot phases
- catching obvious collapse back into nearest-neighbor confusion

### B. Boundary baseline

File:

- `experiments/frontstage-pilot/results/feedback-boundary-baseline-v0.1.json`

Use it for:

- feedback task-structure separability
- `selected` vs `blend`
- same-domain nudge vs `corrected-domain`
- readiness decisions for feedback supervision

### Training-prep rule

- package gate: nearest-neighbor remains primary
- feedback gate: boundary baseline remains primary
- feedback nearest-neighbor remains secondary and should not block training prep by itself

---

## 5. What Enters Training Prep Now

### Package

Enters formal training preparation now because:

- domain boundary collapse has been resolved in the frozen slice
- pure atmosphere is no longer unstable against nearby mixed / vague lanes
- current package baseline has cleared the earlier readiness bottleneck

### Feedback-signals

Enters formal training preparation now because:

- `corrected-domain` and `blend-proposals` are clearly separable under boundary-aware evaluation
- the feedback surface is now structured strongly enough around previous context
- closed-loop contrast samples now support domain-exit and trace-removal continuation behavior

---

## 6. What Stays Deferred

`response-plan generation` stays deferred because:

- it is still more style-sensitive than package / feedback supervision
- the current readiness conclusion is anchored on package and feedback, not planner wording generation
- moving it into the next training track now would blur the mainline again

---

## 7. Immediate Next Actions

1. Use `train-prep-v0.1` as the frozen dataset reference for package / feedback training work.
2. Use `splits-v0.1.json` as the initial train / validation split definition.
3. Keep both baseline families in the training-prep loop.
4. Do not expand data again unless a new training-run failure reveals a specific anchor gap.
5. Keep `response-plan generation` outside the active training-prep scope.
