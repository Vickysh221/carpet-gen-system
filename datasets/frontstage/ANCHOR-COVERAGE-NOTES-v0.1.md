# Anchor Coverage Notes v0.1

Date: 2026-04-05

## 1. Scope

This note now refers to the frozen readiness snapshot:

- `datasets/frontstage/train-prep-v0.1/manifest-v0.1.json`

This is the same snapshot used by:

- `docs/training-readiness-checkpoint-after-stabilization-pass-v0.1.md`

The baseline result files cited during readiness still point at `datasets/frontstage/pilot-v0.1/**`, but that pilot slice has been refreshed from the same gold files and now matches this frozen train-prep snapshot on counts and content.

Important cleanup note:

- the earlier `package: 26` count in this file was a stale Task 22 coverage state
- the current readiness checkpoint is **not** based on that older slice
- the current frozen slice is:
  - `package: 29`
  - `feedback-signals: 22`
  - `closed-loop: 10`

So this file has been updated to match the same frozen dataset that supports the readiness conclusion.

---

## 2. Package Coverage

Current package sample count:

- `29`

### Domain counts

- `floralHerbalScent`: `4`
- `mixedImageryComposition`: `10`
- `vagueRefinementPreference`: `4`
- `softMineralTexture`: `3`
- `moistThresholdAtmosphere`: `4`
- `coastalAiryBrightness`: `4`

### Main handle cluster thickness

- `lavender-scent`: `4`
- `scent-floating`: `10`
- `scent-into-air`: `4`
- `coastal-bright-air`: `8`
- `lemon-leaf-trace`: `4`
- `mist-rain-field`: `7`
- `bamboo-shadow-trace`: `3`
- `low-presence`: `7`
- `airy-breathing`: `3`
- `botanical-intent`: `3`
- `open-not-locked`: `4`
- `restrained-refinement`: `4`
- `mineral-surface-soft`: `3`
- `mineral-density-softened`: `3`
- `lavender-purple-grey`: `2`
- `lavender-botanical-trace`: `2`

### Package anchor readout

What is now materially stronger:

- `interpretationDomain` is no longer collapsing on pure atmosphere lanes
- `interpretationHandles` now have enough repeated phrasing to support formal-training preparation
- pure `moistThresholdAtmosphere` and pure `coastalAiryBrightness` are no longer near-singleton domains
- contrast-set and stabilization rewrites pulled pure atmosphere away from mixed / vague neighbors
- `misleadingPaths` remain present across the stabilized package slice

Residual thin points:

- `lavender-purple-grey` and `lavender-botanical-trace` are still relatively thin support handles
- `softMineralTexture` remains smaller than the main atmosphere / mixed lanes
- package confidence prediction is still weaker than domain prediction

---

## 3. Feedback Coverage

Current feedback sample count:

- `22`

### Signal coverage

- samples with `selectedProposalIds`: `8`
- samples with `blendedProposalIds`: `7`
- samples with `boostedHandles`: `17`
- samples with `reducedHandles`: `13`
- samples with `correctedDomain`: `5`

### Feedback anchor readout

What is now materially stronger:

- `blend-proposals` is no longer a sparse warning lane
- `corrected-domain` now spans mixed -> pure and pure -> pure transitions
- same-domain nudge, blend, and corrected-domain have all been explicitly supervised as separate action surfaces
- corrected-domain continuation is now also supported by closed-loop contrast examples where old trace objects are removed in `nextPackage`

Residual thin points:

- boost / reduce fine detail is still noisier than blend / corrected-domain boundary detection
- nearest-neighbor retrieval still underestimates feedback separability because it copies local wording rather than action structure
- some proposal-choice distinctions remain closer to stylistic phrasing than to hard semantic exits

---

## 4. Dual Baseline Role

Both baselines are kept on purpose, but they do different jobs.

### `nearest-neighbor` baseline

Use it for:

- coarse lexical regression checks
- historical comparison against earlier pilot states
- detecting when a dataset is still collapsing into obvious nearest-neighbor confusion

Do **not** use it as the only readiness gate for feedback.

Why:

- feedback is structured around action type over prior context
- nearest-neighbor retrieval overweights surface phrasing and underweights proposal/action structure

### `boundary` baseline

Use it for:

- `selected / blend / corrected-domain` task-structure separability
- judging whether the feedback surface is clean enough to support formal training preparation
- checking whether rewritten decision-boundary language is actually usable

Current practical rule:

- package readiness can still lean on nearest-neighbor because domain collision was the main package failure mode
- feedback readiness should be judged primarily by the boundary baseline, with nearest-neighbor retained as a weaker historical comparator

---

## 5. Stabilization Outcome

The current anchor picture is:

- package boundaries are strong enough for formal-training preparation
- feedback boundaries for `corrected-domain` and `blend-proposals` are strong enough for formal-training preparation under boundary-aware evaluation
- `response-plan generation` is still not the next main training target

The practical outcome is:

- data thickening is no longer the main bottleneck
- the project can move from data expansion into package / feedback training preparation
- future evaluation should keep both baselines, but assign them different gate roles
