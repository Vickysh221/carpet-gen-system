# Frontstage Gold Dataset v0.1

This directory holds the first structured training-prep assets for the frontstage loop:

`user input -> FrontstageSemanticPackage -> FrontstageResponsePlan -> user feedback -> ProposalFeedbackSignal -> next-turn adjustment`

## Directory Layout

- `package/`: gold samples for `text -> FrontstageSemanticPackage`
- `response-plan/`: gold samples for `text + package -> FrontstageResponsePlan`
- `feedback-signals/`: gold samples for `previous plan + user feedback -> ProposalFeedbackSignal`
- `closed-loop/`: gold samples for `input + package + plan + feedback + signal -> next package + next plan`
- `schema-v0.1.json`: machine-readable JSON Schema covering all four sample types
- `schema-v0.2.json`: machine-readable JSON Schema with package-level auxiliary supervision

## File Convention

Each task directory stores JSONL files. One line is one sample.

Current canonical files:

- `package/gold-v0.1.jsonl`
- `response-plan/gold-v0.1.jsonl`
- `feedback-signals/gold-v0.1.jsonl`
- `closed-loop/gold-v0.1.jsonl`

Current schema recommendation:

- use `schema-v0.2.json` for package samples that include the auxiliary supervision layer
- `schema-v0.1.json` remains as the pre-augmentation reference

## Common Fields

Every sample uses the same top-level metadata:

- `id`: stable sample id
- `sampleType`: `package` | `response-plan` | `feedback-signal` | `closed-loop`
- `version`: current dataset version, now `v0.1`
- `status`: `seed` or `curated`
- `sourceCase`: short case label used during export and curation
- `sourceRunner`: runtime/export path that produced the seed
- `difficultyTags`: difficulty coverage labels for curation and train/eval slicing
- `input`: task-specific input object
- `output`: task-specific supervision target
- `notes`: short curation notes only when needed

## Package Auxiliary Supervision Layer

Starting from the minimal-supervision addition pass, package samples may include:

- `output.supervision.evidenceCues`
- `output.supervision.associationReadings`
- `output.supervision.designTranslationHints`

This layer is dataset-only for now.
It does not replace the runtime `FrontstageSemanticPackage` object.

### `evidenceCues`

Minimum rationale support for:

- domain
- handle
- misleading path

### `associationReadings`

Minimum association hierarchy:

- `primary`
- `secondary`
- `nearbyButSuppressed`

### `designTranslationHints`

Minimum translation bridge:

- `baseLayer`
- `traceLayer`
- `suppressedLiteralization`

## Canonical Language Rules

System-side `response-plan` samples must:

- stay non-robotic
- avoid system-reporting tone
- keep a light advisor voice
- present blendable proposals, not binary exclusion cards
- keep `refinementPrompt.text` sounding like a human nudge, not an instruction template

User-side `feedback-signal` samples must:

- use natural user phrasing
- preserve the previous response-plan context
- avoid parser-feeding shorthand such as `更像2，空气+1`

## Difficulty Coverage For v0.1

The first batch must cover these hard cases, not only raw count:

- `corrected-domain`
- `mixed-imagery`
- `vague-preference`
- `feedback-reduce-boost`
- `feedback-corrected-domain`

These coverage tags are attached per sample in `difficultyTags`.

## What Should Not Enter Gold

Reject or downgrade to `seed` when a sample has any of these issues:

- output still mirrors internal slot labels instead of user-facing semantics
- proposals are mutually exclusive in logic and not blendable
- `refinementPrompt` sounds like parser instructions
- user feedback reads like benchmark shorthand instead of real speech
- corrected-domain samples do not preserve the previous mistaken context
- closed-loop samples hide the prior package or prior response plan
- auxiliary supervision is added but still cannot explain why the domain / handles / anti-literalization decisions hold

## Seed To Curated Workflow

1. Export a seed batch from the current runtime:

```bash
node --experimental-specifier-resolution=node scripts/export-frontstage-gold-samples.mjs --type=all --status=seed
```

2. Review the generated records.

3. Fix wording, handle ordering, domain corrections, and misleading-path cleanup manually.

4. Promote accepted samples into the `gold-v0.1.jsonl` files by changing:

- `status: "seed"` -> `status: "curated"`
- `notes` to capture any non-obvious manual intervention

## Task 2 Leftovers Moved Into Curation

These known issues should be tracked as curation notes, not as blockers for Task 3:

- corrected-domain turns can still leave proposal title and summary slightly out of sync with new dominant handles
- reduce/boost rerank is usable but not always the most intuitive on edge phrasing
- handle granularity is still coarse in some domains

Those issues are acceptable in `seed` export and should be cleaned during dataset curation.

## v0.2 Curation Direction

The v0.2 pass focuses on sample cleanup, not feature expansion:

- expand `closed-loop` coverage to a minimally trainable range
- clean corrected-domain continuations so `title`, `summary`, `dominantHandles`, and `suppressedHandles` read like one supervision target
- reduce runtime-shaped wording such as `先留 X，再带 Y` when the rest of the dataset already uses a more natural curated style

## v0.3 Minimal Supervision Direction

The next high-leverage dataset move is not a runtime schema rewrite.
It is adding a narrow auxiliary supervision layer around package samples so that future expansion teaches:

- why a package result holds
- what the association hierarchy is
- how the reading should translate into base / trace / suppression logic

For package curation, use:

- `datasets/frontstage/PACKAGE-SAMPLE-CURATOR-CHECKLIST-v0.1.md`
