# Future Task Guardrails From Task Chain 12-20 v0.1

Date: 2026-04-04

## 1. Purpose

This note defines the guardrails for all later dataset, supervision, pilot, and training tasks after the Task 12-20 chain.

Its purpose is simple:

future work must keep growing the established frontstage semantic chain,
not quietly replace it with a new center such as evidence bookkeeping, association labels, or schema symmetry.

---

## 2. What Future Work Must Continue To Orbit

Every later task must still serve this chain:

`text -> interpretationDomain / domainConfidence -> interpretationHandles -> compositionAxes / compositionProposals -> refinementPrompt -> ProposalFeedbackSignal -> re-entry`

In practice, this means future work must continue to optimize:

- correct interpretation before continuation
- user-facing handles as the primary frontstage object
- weighted blending instead of binary disambiguation
- refinement as semantic continuation, not hidden form filling
- feedback as re-entry into the same semantic system
- anti-literalization as part of intended ability, not as an afterthought

---

## 3. What Counts As Mainline Extension

The following changes remain inside the mainline:

### 3.1 Package-supporting supervision

Examples:

- adding `evidenceCues` that explain why a domain or handle holds
- adding `associationReadings` that preserve association hierarchy before handle compression
- adding `designTranslationHints` that better connect package semantics to proposal logic

Why this is allowed:

- these layers serve `interpretationDomain`, `interpretationHandles`, and proposal generation
- they do not replace them as the actual frontstage target

### 3.2 More package samples aligned to existing anchors

Examples:

- new intent-description samples that expand domain and handle coverage
- new mixed-imagery samples that still lead to handles and blendable relations
- new vague-preference samples that still preserve “open but directed” frontstage continuation

Why this is allowed:

- the samples still supervise the same package object

### 3.3 More feedback and closed-loop coverage

Examples:

- more reduce / boost variants over existing handles
- more corrected-domain recovery cases
- more closed-loop examples where next-turn package and plan visibly change

Why this is allowed:

- the feedback still modifies the same package/proposal system instead of becoming a standalone intent classifier

### 3.4 Baseline and pilot extensions tied to existing objects

Examples:

- evaluating package-domain stability
- evaluating handle prediction
- evaluating corrected-domain and boost/reduce re-entry

Why this is allowed:

- the evaluation still asks whether the established mainline is learnable

---

## 4. What Counts As Drift Or Object Replacement

The following changes should be treated as guardrail violations unless explicitly re-approved.

### 4.1 New fields become more important than handles

Violation pattern:

- samples are curated mainly around evidence labels or association labels
- `interpretationHandles` become a byproduct instead of the thing the user will continue to work with

Why this is drift:

- it swaps the product object without saying so

### 4.2 Package training silently becomes generic extraction

Violation pattern:

- new tasks focus mainly on domain or cue classification
- little or no pressure remains on user-facing handles, axes, or misleading paths

Why this is drift:

- it regresses to semantic extraction instead of frontstage-ready interpretation

### 4.3 Proposal logic stops serving weighted blending

Violation pattern:

- later work mainly optimizes binary disambiguation
- proposals become mutually exclusive cards
- refinement prompts become hidden form questions

Why this is drift:

- it abandons Task 13's core continuation logic

### 4.4 Feedback is treated as isolated label prediction

Violation pattern:

- feedback tasks no longer require previous package or previous response-plan context
- evaluation ignores whether feedback updates the next package / plan correctly

Why this is drift:

- the same semantic system is broken into unrelated classifiers

### 4.5 Schema expansion no longer serves frontstage continuation

Violation pattern:

- new fields are added because they look complete on paper
- no clear path exists from the new field to package / proposal / feedback behavior

Why this is drift:

- the project starts optimizing representation completeness instead of semantic usefulness

---

## 5. Mandatory Guardrail Checklist For Every New Task

Every future task card should answer these questions explicitly.

1. Which existing semantic anchor does this task serve?
2. Which segment of the current chain does it strengthen:
   - interpretation
   - handle formation
   - proposal blending
   - refinement continuation
   - feedback re-entry
   - anti-literalization
3. Does it preserve `interpretationHandles` as the main user-facing semantic object?
4. Does it keep feedback attached to previous package / proposal context?
5. Could it accidentally make a new field or label family more important than the current product object?
6. Which of the six core benchmark cases will be used to verify it?
7. What failure mode would prove this task is drifting off the mainline?

If a task card cannot answer these seven questions, it is not ready.

---

## 6. Required Opening Block For Future Task Cards

Every next-wave task card should begin with a short anchor reminder covering these points:

1. The semantic mainline is:
   `FrontstageSemanticPackage -> FrontstageResponsePlan -> ProposalFeedbackSignal -> re-entry`
2. `interpretationDomain` and `interpretationHandles` remain the primary package anchors.
3. `compositionProposals` remain blendable, not binary.
4. `ProposalFeedbackSignal` remains feedback-over-context, not isolated classification.
5. New supervision layers may explain or stabilize anchors, but may not replace them.

This opening block should be mandatory for:

- dataset expansion tasks
- schema / supervision tasks
- pilot / baseline tasks
- training-readiness tasks

---

## 7. Requirements For New Sample Expansion

When future tasks add package samples, they must align to both field and behavior anchors.

### 7.1 Field alignment

Each new package sample must still primarily supervise:

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `compositionAxes`
- `misleadingPaths`

Auxiliary supervision is allowed only if it still points back to those fields.

### 7.2 Behavior alignment

Each new sample should still support at least one of these behaviors:

- stable domain gating
- user-facing handle continuation
- blendable proposal formation
- natural refinement continuation
- structured feedback re-entry
- anti-literalization

If a sample only improves label coverage but does not help one of these behaviors, it is weakly aligned.

---

## 8. Requirements For New Supervision Layers

Every new supervision layer must prove all three of these:

1. Which existing anchor it explains or stabilizes
2. Why the current anchor is still the main target
3. Which benchmark case becomes more understandable or more learnable because of this layer

Minimum proof format:

- `serves anchor: ...`
- `does not replace: ...`
- `validated on cases: ...`

If a proposed layer cannot fill these three lines concretely, it should not be added yet.

---

## 9. Requirements For Baseline And Pilot Evaluation

Later pilots should keep evaluating by anchor, not just by field count.

### 9.1 Package evaluation should continue to ask

- Is domain prediction improving?
- Are user-facing handles becoming more stable?
- Are axes and misleading paths still tied to the intended reading?

### 9.2 Feedback evaluation should continue to ask

- Can the model map natural feedback back onto the previous package / proposal context?
- Are `boost`, `reduce`, `blend`, and `corrected-domain` still modifying the same semantic system?

### 9.3 Closed-loop evaluation should continue to ask

- Does the next package / plan visibly preserve, reorder, or suppress the same semantic objects?

Metrics that do not connect back to these questions are secondary.

---

## 10. Concrete Decision For The Next Task Wave

The next task wave should be organized by anchor-serving passes, not by free-form schema growth.

Recommended organization:

### Pass A: package expansion against existing anchors

Goal:

- expand intent-description coverage while preserving domain / handles / axes / misleading-path supervision

Rule:

- each new sample must pass the package curator checklist
- auxiliary supervision must remain subordinate

### Pass B: feedback and closed-loop strengthening

Goal:

- expand natural re-entry over the same handle / proposal objects

Rule:

- no feedback sample should be added without previous package / response-plan context

### Pass C: anchor-based evaluation refresh

Goal:

- rerun package and feedback pilots while reporting where the current anchors are still weak

Rule:

- report by domain, handle stability, corrected-domain, boost/reduce conflict, and closed-loop consistency

Not recommended for the next wave:

- schema-completion tasks that are not tied to one anchor
- response-plan full generation training as a headline task
- supervision additions that do not clearly strengthen package / proposal / feedback continuity

---

## 11. Final Guardrail Statement

Future work is on the mainline only if it makes the current frontstage semantic chain thicker:

- better interpretation
- better handles
- better weighted blending
- better refinement continuation
- better feedback re-entry
- better anti-literalization

If it mainly makes the schema look richer while the above chain does not become clearer, more stable, or more learnable, it is drift.
