# Package Supervision Basis Map v0.1

Date: 2026-04-04

## 1. Purpose

This document back-audits the current frontstage dataset against the original interpretation / association definitions.

It answers three questions:

1. What the current dataset is already supervising
2. Which design definitions those targets come from
3. Where the current fields already carry interpretation, association, and anti-misread control

This is not a proposal for a brand-new schema. It is a supervision basis map for the schema and gold samples that already exist.

---

## 2. Source Basis

Primary definition sources used in this audit:

- [docs/39-frontstage-semantic-curation-closed-loop-v0.1.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/docs/39-frontstage-semantic-curation-closed-loop-v0.1.md)
- [projects-notes/semantic-expansion-rule/38-fuli-semantic-canvas-for-poetic-and-metaphoric-inputs-v0.1.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/projects-notes/semantic-expansion-rule/38-fuli-semantic-canvas-for-poetic-and-metaphoric-inputs-v0.1.md)
- [docs/carpet-pattern-semantic-slots-prd-2026-04-04.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/docs/carpet-pattern-semantic-slots-prd-2026-04-04.md)
- [docs/intent-semantic-mapping-schema-v1-2026-04-01.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/docs/intent-semantic-mapping-schema-v1-2026-04-01.md)
- [docs/intent-intake-agent-signal-schema-v1-2026-04-01.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/docs/intent-intake-agent-signal-schema-v1-2026-04-01.md)

Primary dataset and implementation sources:

- [datasets/frontstage/package/gold-v0.1.jsonl](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/package/gold-v0.1.jsonl)
- [datasets/frontstage/response-plan/gold-v0.1.jsonl](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/response-plan/gold-v0.1.jsonl)
- [datasets/frontstage/feedback-signals/gold-v0.1.jsonl](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/feedback-signals/gold-v0.1.jsonl)
- [datasets/frontstage/closed-loop/gold-v0.1.jsonl](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/closed-loop/gold-v0.1.jsonl)
- [src/features/entryAgent/frontstageSemanticPackage.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageSemanticPackage.ts)
- [src/features/entryAgent/frontstageResponsePlanner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageResponsePlanner.ts)
- [src/features/entryAgent/proposalFeedbackSignals.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/proposalFeedbackSignals.ts)
- [experiments/frontstage-pilot/results/package-baseline-v0.1.json](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/experiments/frontstage-pilot/results/package-baseline-v0.1.json)
- [experiments/frontstage-pilot/results/feedback-baseline-v0.1.json](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/experiments/frontstage-pilot/results/feedback-baseline-v0.1.json)

---

## 3. Current Sample Types And What They Supervise

### 3.1 `package`

Task:

`inputText -> FrontstageSemanticPackage`

Current supervised output fields:

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `compositionAxes`
- `misleadingPaths`

What this sample type is already supervising:

- interpretation domain selection
- coarse confidence for whether the frontstage should commit or stay corrigible
- user-facing semantic handles
- blendable design relations
- anti-misread and anti-literalization boundaries

What this sample type does not yet supervise directly:

- explicit evidence chain for why a handle or domain was chosen
- explicit association hierarchy
- explicit design-translation rationale beyond the axis labels themselves

### 3.2 `response-plan`

Task:

`inputText + package -> FrontstageResponsePlan`

Current supervised output fields:

- `replySnapshot`
- `optionalDomainCheck`
- `compositionProposals`
- `refinementPrompt`

What this sample type is already supervising:

- how package outputs are exposed to the user
- how handles are turned into blendable proposals
- how the system invites bounded continuation instead of binary disambiguation

What this sample type partially supervises:

- design translation, via proposal structure
- bounded imagination, via what the proposals permit and what they suppress

What this sample type does not supervise cleanly enough yet:

- stable reply style independent of wording variance
- explicit rationale for why one proposal shape is preferred over another

### 3.3 `feedback-signals`

Task:

`userFeedbackText + previousPackage + previousResponsePlan -> ProposalFeedbackSignal`

Current supervised output fields:

- `selectedProposalIds`
- `blendedProposalIds`
- `boostedHandles`
- `reducedHandles`
- `correctedDomain`

What this sample type is already supervising:

- whether user feedback is selection, blend, boost, reduce, or correction
- whether the user is re-entering the loop as a chooser, a blender, or a corrector

Definition basis:

- `frontstage closed loop` doc says the system should support composition by weighted blending, not binary exclusion
- signal schema says agent-consumable state updates should preserve interpretation

### 3.4 `closed-loop`

Task:

`input + package + responsePlan + feedback + signal -> nextPackage + nextResponsePlan`

What this sample type is already supervising:

- whether feedback actually changes semantic emphasis
- whether corrected-domain updates the next turn rather than remaining a note
- whether blend / boost / reduce produce a new continuation structure

What this sample type partially supervises:

- planner behavior after feedback
- bounded imagination under correction

What it still under-supervises:

- why the next turn changed the way it did
- which prior evidence was preserved and which was intentionally discarded

---

## 4. Field-Level Ability Map

### 4.1 Fields Mainly Carrying Interpretation

#### `interpretationDomain`

Main ability carried:

- high-level interpretation typing

Definition basis:

- `frontstage closed loop` required semantic intermediate layer
- `semantic canvas` layer 2 to layer 3 bridge

Current supervision effect:

- prevents collapse into generic atmosphere
- creates the first branching point for frontstage behavior

Limitation:

- this is still a compressed decision; it does not encode why the system chose the domain

#### `domainConfidence`

Main ability carried:

- commitment control

Definition basis:

- frontstage doc says low confidence should not go straight into full proposal generation

Current supervision effect:

- teaches when to expose a warm domain check versus when to proceed

Limitation:

- confidence is outcome-only, not evidence-linked

#### `interpretationHandles`

Main ability carried:

- interpretation expressed as reusable user-facing semantic handles

Definition basis:

- frontstage doc explicitly requires user-usable handles instead of slot labels
- semantic canvas doc says conceptual / experiential inputs must survive rather than collapsing into raw parameters

Current supervision effect:

- this is the main place where interpretation and association are currently fused
- handles carry partial imagery, partial experiential reading, and partial interaction affordance

Important audit point:

- handles already carry some association, but only in compressed form
- they are not yet a dedicated association layer

### 4.2 Fields Mainly Carrying Association / Imagery

#### `interpretationHandles`

Association role:

- carries the frontstage-ready residue of imagery and sensory association

Examples already supervised:

- `海边空气的亮和留白先成立`
- `叶感只留一点清绿苦感的痕迹`
- `烟雨一样的湿润空气做底`

Definition basis:

- semantic canvas layer 2 conceptual / experiential layer
- frontstage doc section on user-usable semantic handles

Current state:

- enough to preserve association traces
- not enough to separate primary association from support association

#### `replySnapshot`

Association role:

- packages multiple handles into a human-readable first-pass reading

Current state:

- useful for frontstage quality
- weak as a clean supervision basis for pure interpretation because it is prose-shaped

### 4.3 Fields Mainly Carrying Design Translation

#### `compositionAxes`

Main ability carried:

- translation from semantic reading into adjustable design relation

Definition basis:

- frontstage doc says system should support weighted blending
- carpet pattern semantic slots PRD says the system needs an intermediate representation for how a pattern stands up, what becomes trace, what becomes atmosphere

Current supervision effect:

- teaches relations such as air vs leaf trace, scent vs trace, mist vs bamboo shadow
- partially carries design translation because it specifies how semantic components enter the pattern

Important audit point:

- `compositionAxes` supervise relation, not full translation policy
- they do not explicitly say what becomes base, trace, architecture, density, or flow in compiler terms

#### `compositionProposals`

Main ability carried:

- operational design translation for the user-facing planner

Current state:

- proposals already encode some “what becomes base / what becomes trace / what gets suppressed”
- but this is embedded in prose plus handle ordering, not a dedicated structured translation layer

### 4.4 Fields Mainly Carrying Bounded Imagination

#### `misleadingPaths`

Main ability carried:

- anti-misread and anti-literalization policy

Definition basis:

- semantic canvas rule: some signals must not be over-literalized
- carpet PRD: object similarity is not enough and pattern semantics must not degrade into scenic illustration

Current supervision effect:

- strongly useful for bounded imagination
- teaches the system what not to become

Important audit point:

- this is mostly negative policy
- it does not yet say what positive expansion is allowed, only what should be blocked

#### `suppressedHandles`

Main ability carried:

- local continuation boundary in a proposal

Current state:

- helps teach what should not dominate in this turn
- supports bounded imagination inside the proposal planner

Limitation:

- still proposal-local, not a general association policy layer

---

## 5. Supervision Basis By Core Ability

### 5.1 Interpretation

Already structurally supervised by:

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `correctedDomain`
- `nextPackage`

Assessment:

- interpretation is the strongest supervised ability in the current schema
- this is why corrected-domain and package task are already legible as trainable tasks

### 5.2 Association / Imagery

Already partially supervised by:

- `interpretationHandles`
- `replySnapshot`
- `compositionProposals`

Assessment:

- association is present, but compressed into handle labels and planner prose
- there is no separate structured layer for “what associations were activated, in what rank, by which cue”

### 5.3 Design Translation

Already partially supervised by:

- `compositionAxes`
- proposal `dominantHandles` and `suppressedHandles`
- closed-loop next-turn proposal changes

Assessment:

- current data supervises frontstage-level translation
- it does not yet cleanly supervise compiler-facing pattern translation

### 5.4 Bounded Imagination

Already partially supervised by:

- `misleadingPaths`
- proposal suppression
- corrected-domain continuation

Assessment:

- negative boundary is present
- positive expansion policy is still implicit

---

## 6. What The Pilot Results Confirm

The pilot results reinforce the same reading:

- package baseline failure shows the current task is not reducible to surface classification with so little data
- feedback baseline shows corrected-domain is easier than boost / reduce

Interpretation from this:

- current schema is carrying real semantic abilities, not just trivial labels
- but the dataset is still too small and too compressed to make association and translation robust

---

## 7. Summary

Current frontstage supervision is already doing real work:

- `interpretationDomain` and `correctedDomain` carry interpretation typing
- `interpretationHandles` carry compressed interpretation-plus-association
- `compositionAxes` carry partial design translation
- `misleadingPaths` carry negative bounded-imagination policy

The current package dataset is therefore not “just classification”.

But it is also not yet a complete supervision basis for:

- evidence-linked interpretation
- explicit association structure
- explicit design translation policy
- positive bounded imagination

Those gaps are not reasons to discard the current schema. They are reasons to identify the smallest missing supervision layers before scaling Task 17 blindly.
