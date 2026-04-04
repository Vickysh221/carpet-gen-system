# Interpretation And Association Supervision Gap Audit v0.1

Date: 2026-04-04

## 1. Audit Question

Do the current fields and pilot tasks actually supervise the intended core abilities:

- interpretation
- association / imagery
- design translation
- bounded imagination

Short answer:

- interpretation: mostly yes
- association: partially
- design translation: partially
- bounded imagination: negatively yes, positively not enough

This means the current schema is usable, but incomplete in a very specific way: it is strong on interpreted outcomes and weak on explicit semantic basis.

---

## 2. What Is Already Fielded

### 2.1 Interpretation ability already fielded

The following fields already carry interpretation ability in a structured way:

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `correctedDomain`
- `nextPackage`

Why this matters:

- the current system can already supervise “what kind of reading this input should become”
- this is materially more than slot filling

### 2.2 Association / imagery ability already fielded

The following fields already carry some association:

- `interpretationHandles`
- `replySnapshot`
- `compositionProposals`

Why this matters:

- the system is not only extracting objects or slots
- it already stores image-like and sensory association residues such as air, trace, scent, diffusion, density

Key limitation:

- association is not represented as its own explicit layer
- it is fused into handles and prose

### 2.3 Design translation ability already fielded

The following fields already partially carry design translation:

- `compositionAxes`
- proposal `dominantHandles`
- proposal `suppressedHandles`
- closed-loop next-turn response plan

Why this matters:

- the current schema already teaches some “how should this enter the pattern” behavior
- this is why the frontstage planner can already present blendable continuation options

Key limitation:

- translation remains frontstage-facing, not compiler-facing
- there is no explicit structured representation of base layer / trace layer / structure layer / atmospheric surface

### 2.4 Bounded imagination already fielded

The following fields already carry bounded imagination:

- `misleadingPaths`
- `suppressedHandles`
- corrected-domain continuation behavior

Why this matters:

- the system has explicit anti-literalization constraints
- this prevents some high-cost failure modes

Key limitation:

- current supervision is mostly about what not to do
- it says too little about which expansions are permitted

---

## 3. Where Current Supervision Compresses Too Much

### 3.1 Evidence / rationale layer is missing

Current problem:

- package gold contains outcome fields
- it rarely contains explicit evidence fields

What is therefore missing:

- which cue or phrase supported the domain
- which cue supported each handle
- which phrase triggered a misleading path

Risk if left missing:

- training can learn the end result without learning why
- future models may imitate label distributions but fail to generalize on nearby phrasing

Current workaround:

- `sourceSignals` exists on handles

Why it is not enough:

- it is handle-local only
- it does not supervise domain evidence, axis evidence, or misleading-path evidence as first-class targets

### 3.2 Association / imagery layer is still implicit

Current problem:

- `interpretationHandles` carry compressed imagery
- but they do not distinguish:
  - primary association
  - supporting association
  - weak but allowed association

Risk if left missing:

- model training may compress everything into whichever handle looks most label-like
- association will be learned as “surface verbal cluster” rather than “ranked imagery structure”

Typical compression failure:

- a model learns `海边空气的亮和留白先成立`
- but does not separately learn that this was the dominant association and `叶感只留一点清绿苦感的痕迹` was auxiliary

### 3.3 Design translation layer is only partially explicit

Current problem:

- `compositionAxes` describe adjustable relations
- proposals describe translated continuation in prose

What is missing:

- explicit structured translation targets such as:
  - what becomes base atmosphere
  - what remains trace
  - what should not stand up as object
  - what kind of pattern behavior this implies

Risk if left missing:

- the model may learn frontstage paraphrase without learning the internal design logic
- future expansion of package samples may only replicate semantic labels, not semantic-to-design handling

### 3.4 Positive bounded-imagination policy is missing

Current problem:

- `misleadingPaths` mainly expresses forbidden directions

What is missing:

- an explicit field for allowed expansion boundary
- examples of “you may expand to here, but not beyond here”

Risk if left missing:

- models may either over-literalize or become too conservative
- negative constraints alone do not teach the “right degree” of imaginative continuation

---

## 4. Which Abilities Could Be Flattened If We Expand Samples Now

If Task 17 directly expands package samples on the current schema without any extra supervision layer, the following flattening risks are high.

### 4.1 Interpretation may flatten into coarse domain classification

Why:

- `interpretationDomain` is the cleanest and most repeatable target
- with no explicit evidence layer, scaling data may bias future models toward domain-first shortcuts

### 4.2 Association may flatten into handle extraction

Why:

- `interpretationHandles` are currently doing too many jobs at once
- the model can succeed by emitting plausible handles without learning deeper association structure

### 4.3 Design translation may flatten into relational slogans

Why:

- `compositionAxes` are useful, but still only a thin relation layer
- the model may learn “A vs B” wording without learning real pattern translation

### 4.4 Bounded imagination may flatten into pure anti-literalization

Why:

- `misleadingPaths` are one-sided
- the model may learn to suppress too much rather than learning a bounded positive expansion space

---

## 5. Minimal Supervision Layers Worth Adding

This audit does not support a full schema rewrite. It supports adding the smallest missing layers with the highest leverage.

### 5.1 Minimal evidence layer

Suggested addition:

- `evidenceSpans` or `evidenceCues`

Minimum scope:

- for package samples only
- each package can map:
  - domain -> supporting cues
  - handle -> supporting cues
  - misleadingPath -> supporting cues

Why this is the smallest high-value addition:

- it strengthens interpretability without changing the frontstage object shape dramatically

### 5.2 Minimal association layer

Suggested addition:

- `associationReadings`

Minimum scope:

- `primary`
- `secondary`
- optional `discarded-but-nearby`

Why:

- this separates “imagery that was activated” from “handles given to the user”
- it preserves association structure before frontstage compression

### 5.3 Minimal design translation layer

Suggested addition:

- `designTranslationHints`

Minimum scope:

- `baseLayer`
- `traceLayer`
- `suppressedLiteralization`

Why:

- this is enough to connect package-level semantics to the carpet pattern intermediate representation
- it avoids forcing response-plan prose to carry all translation supervision alone

### 5.4 Minimal bounded-imagination policy layer

Suggested addition:

- `associationPolicy`

Minimum scope:

- `allowedExpansion`
- `forbiddenExpansion`

Why:

- complements `misleadingPaths`
- teaches the model not only where to stop, but how far it may responsibly go

---

## 6. Decision For Task 17

## Decision: Option B

Current schema is not empty or broken, but it is not sufficient to support unlimited package-sample expansion without supervision drift.

Therefore:

**Task 17 should first add a minimal supervision layer, then expand intent description samples.**

### Why not Option A

If we continue directly expanding package samples now:

- we will mostly scale domain labels and handle phrases
- evidence will remain implicit
- association will remain compressed into handles
- design translation will remain under-specified
- bounded imagination will remain mostly negative-only

That would increase data volume, but it would also increase the chance that training learns a thinner ability than the product definition actually wants.

### Why Option B is the better next move

Because the current gaps are narrow and high leverage:

- add minimal evidence supervision
- add minimal association reading structure
- add minimal design translation hints
- add minimal positive association policy

Then continue sample expansion on a schema that better matches the intended ability surface.

---

## 7. Recommended Next Step After This Audit

For the next Task 17 pass:

1. Keep the current package object intact.
2. Add a narrow auxiliary supervision layer rather than replacing existing fields.
3. Backfill that layer on a small number of core cases first.
4. Validate that the new layer improves explanation fidelity before scaling more package samples.

In practical terms:

- do not stop using `interpretationDomain`, `interpretationHandles`, `compositionAxes`, `misleadingPaths`
- do add one small structured layer that explains why these outputs exist and how far the association may go

That is the smallest move that protects the definition of interpretation and association from being flattened during the next expansion round.
