# Task-Chain 12-20 Semantic Anchor Map v0.1

Date: 2026-04-04

## 1. Purpose

This document re-anchors the current dataset and training-prep work to the actual semantic mainline established by Task Cards 12-20.

It answers:

1. What semantic chain Tasks 12 and 13 actually established
2. What training-readiness objects Tasks 14-16 actually stabilized
3. What learnability boundary Tasks 17-19 actually changed
4. Which objects must remain the semantic anchors for future work

This is not a schema-expansion proposal.
It is a semantic center-of-gravity map.

---

## 2. Source Basis

Primary task-chain sources:

- `12-harness-task-card-query-routing-and-curated-showroom-refactor-v0.1.md`
- `13-harness-task-card-composition-proposals-and-refinement-feedback-v0.1.md`
- `14-harness-task-card-gold-dataset-and-supervision-pipeline-v0.1.md`
- `15-harness-task-card-sample-curation-and-consistency-cleanup-v0.1.md`
- `16-harness-task-card-training-pilot-setup-v0.1.md`
- `17-harness-task-card-intent-description-expansion-v0.2.md`
- `18-harness-task-card-definition-back-audit-for-interpretation-and-association-v0.1.md`
- `19-harness-task-card-minimal-supervision-layer-addition-v0.1.md`
- `20-harness-task-card-semantic-anchor-alignment-and-future-task-guardrails-v0.1.md`

Primary design and implementation sources:

- [docs/39-frontstage-semantic-curation-closed-loop-v0.1.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/docs/39-frontstage-semantic-curation-closed-loop-v0.1.md)
- [src/features/entryAgent/frontstageSemanticPackage.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageSemanticPackage.ts)
- [src/features/entryAgent/frontstageResponsePlanner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageResponsePlanner.ts)
- [src/features/entryAgent/proposalFeedbackSignals.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/proposalFeedbackSignals.ts)
- [src/features/entryAgent/types.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/types.ts)
- [src/features/entryAgent/semanticUnderstanding.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/semanticUnderstanding.ts)
- [src/features/entryAgent/interpretationLayer.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/interpretationLayer.ts)

Primary data-layer sources:

- [datasets/frontstage/package/gold-v0.1.jsonl](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/package/gold-v0.1.jsonl)
- [datasets/frontstage/response-plan/gold-v0.1.jsonl](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/response-plan/gold-v0.1.jsonl)
- [datasets/frontstage/feedback-signals/gold-v0.1.jsonl](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/feedback-signals/gold-v0.1.jsonl)
- [datasets/frontstage/closed-loop/gold-v0.1.jsonl](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/closed-loop/gold-v0.1.jsonl)
- [datasets/frontstage/README.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/README.md)
- [datasets/frontstage/CURATION-NOTES-v0.2.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/datasets/frontstage/CURATION-NOTES-v0.2.md)

Related audit and supervision sources:

- [docs/package-supervision-basis-map-v0.1.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/docs/package-supervision-basis-map-v0.1.md)
- [docs/interpretation-association-supervision-gap-audit-v0.1.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/docs/interpretation-association-supervision-gap-audit-v0.1.md)
- [docs/minimal-supervision-layer-design-v0.1.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/docs/minimal-supervision-layer-design-v0.1.md)

---

## 3. What The Task Chain Actually Established

### 3.1 Tasks 12-13: semantic achievement

Tasks 12 and 13 changed the product center from:

`route / slot / follow-up question`

to:

`interpretation -> frontstage semantic package -> composition proposals -> refinement -> feedback re-entry`

What became real product objects:

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `compositionAxes`
- `misleadingPaths`
- `compositionProposals`
- `refinementPrompt`
- `ProposalFeedbackSignal`

This is the decisive semantic move.
The system is no longer meant to optimize slot completion as the frontstage target.
It is meant to optimize user-usable interpretation and continuation.

### 3.2 Tasks 14-16: training-readiness achievement

Tasks 14-16 did not invent a new semantic center.
They froze the existing center into trainable layers:

- `package`
- `response-plan`
- `feedback-signals`
- `closed-loop`

They also made two strategic choices:

- the first training pilots should target `package` and `feedback`, not full reply generation
- the closed loop must remain visible as one connected semantic system

So the training-prep object is not “whatever structure is available”.
It is the frontstage semantic chain made trainable.

### 3.3 Tasks 17-19: learnability achievement

Tasks 17-19 changed the supervision boundary, not the product center.

They established:

- intent-description expansion should still grow `text -> FrontstageSemanticPackage`
- current package supervision was too compressed
- a minimal auxiliary supervision layer is allowed only to explain and stabilize the package object

What was added:

- `evidenceCues`
- `associationReadings`
- `designTranslationHints`

What was explicitly not changed:

- the runtime `FrontstageSemanticPackage` contract as the main product object
- `interpretationHandles` as the frontstage semantic center

So the auxiliary supervision layer is subordinate, not a replacement anchor.

---

## 4. Non-Negotiable Semantic Anchors

| Anchor | Product responsibility | Dataset / training meaning | Why it must not drift |
|---|---|---|---|
| `interpretationDomain` + `domainConfidence` | Decide what kind of reading is actually holding, and whether the frontstage should commit or stay corrigible | Primary supervision target for `text -> FrontstageSemanticPackage`; also governs corrected-domain and optional domain check behavior | If this drifts into generic semantic extraction, the frontstage loses the gate that prevents wrong-domain proposal generation |
| `interpretationHandles` | Turn interpretation into user-usable semantic objects the user can continue to work with | Main user-facing package target; handle extraction is not enough, but handles remain the main product object | If new layers become more important than handles, the system stops training the thing the user actually sees and manipulates |
| `compositionAxes` | Represent adjustable semantic relations that can support weighted blending | Bridge from package to frontstage continuation; package supervision must still teach usable relation structure | If this collapses into binary disambiguation or abstract parameter Q&A, Task 13's frontstage logic is lost |
| `compositionProposals` + `refinementPrompt` | Convert package semantics into blendable continuation options and invite further weighting / emphasis adjustment | Main supervision target for `response-plan`; also the surface that feedback refers back to | If later work stops serving proposal blendability, the system regresses to choose-one branching |
| `ProposalFeedbackSignal` | Translate natural user feedback into structured re-entry over the previous frontstage result | Main supervision target for feedback task; ties selection, blend, boost, reduce, correction back to the same semantic system | If feedback becomes an isolated classifier, re-entry stops serving the same package/proposal objects |
| `misleadingPaths` | Preserve anti-literalization and anti-misread control as part of intended ability | Negative supervision target in package and closed-loop; also a bounded-imagination guard | If later dataset work expands only positive expression and drops this, the system will over-literalize or lose corrective edge |

---

## 5. Anchor Relations In The Running Chain

The semantic mainline is:

`user text -> interpretationDomain / domainConfidence -> interpretationHandles -> compositionAxes -> compositionProposals -> refinementPrompt -> ProposalFeedbackSignal -> package / plan re-entry`

Supporting layers are allowed only if they strengthen one of the above steps.

### 5.1 What is primary

Primary anchors:

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `compositionAxes`
- `compositionProposals`
- `refinementPrompt`
- `ProposalFeedbackSignal`
- `misleadingPaths`

### 5.2 What is secondary

Secondary support layers:

- `evidenceCues`
- `associationReadings`
- `designTranslationHints`

These are valid only because they help answer:

- why the domain holds
- why the handles hold
- how the handles should translate into proposal logic
- why anti-literalization should still hold

They are not independent end targets.

---

## 6. What Each Anchor Is Responsible For

### 6.1 `interpretationDomain`

Responsible for:

- correct reading type
- frontstage gating
- corrected-domain recovery

If this is wrong:

- every later object is likely to be wrong in a coherent but useless way

### 6.2 `interpretationHandles`

Responsible for:

- what the user is actually asked to react to
- what proposal titles, summaries, and emphasis states are built from
- what feedback boost / reduce operates on

If this is weakened:

- the system may still classify correctly, but it will not have usable frontstage continuations

### 6.3 `compositionAxes` and `compositionProposals`

Responsible for:

- weighted blending instead of binary disambiguation
- “do base / leave trace / suppress objecthood” relations
- turning interpretation into alternative but compatible semantic treatments

If this is weakened:

- the planner falls back to choose-one logic

### 6.4 `ProposalFeedbackSignal`

Responsible for:

- keeping feedback attached to the prior semantic result
- making re-entry semantic rather than conversationally ad hoc

If this is weakened:

- user corrections stop updating the same package / proposal system

### 6.5 `misleadingPaths`

Responsible for:

- anti-literalization
- anti-generic-collapse
- bounded imagination on the negative side

If this is weakened:

- future training may sound semantically rich but still over-render objects, scenes, or style templates

---

## 7. Six-Core-Case Back-Check

The six current core cases still align to the same anchors.

| Case | Still serves `interpretationDomain` first | Still serves `interpretationHandles` as product center | Proposal / re-entry trace still points back to same chain | New supervision layer supports rather than replaces |
|---|---|---|---|---|
| `薰衣草的芳香` | Yes. It still begins with `floralHerbalScent`, not generic atmosphere. | Yes. `lavender-scent`, `scent-into-air`, `lavender-botanical-trace` remain the usable frontstage objects. | Yes. Response-plan proposals are built by reweighting those handles, not by independent association labels. | Yes. `evidenceCues` and `associationReadings` explain why scent-led floral interpretation holds. |
| `加州沙滩和柠檬叶的香气` | Yes. It is still supervised as `mixedImageryComposition`, not as a flat object list. | Yes. `coastal-bright-air`, `scent-floating`, `lemon-leaf-trace` remain the user-facing semantic center. | Yes. Proposal variants still organize air / scent / leaf emphasis as blendable relations. Closed-loop and feedback variants continue to operate on these same objects. | Yes. Auxiliary supervision clarifies primary vs secondary association, but does not replace the handles. |
| `烟雨里有一点竹影` | Yes. Domain is still resolved through atmospheric base plus trace motif, not plain mist classification. | Yes. `mist-rain-field`, `bamboo-shadow-trace`, `low-presence` remain the frontstage continuation objects. | Yes. Response-plan and closed-loop variants still adjust mist vs bamboo vs low-presence relations. | Yes. The added supervision mostly explains subtlety and low-presence evidence. |
| `还不确定，想高级一点` | Yes. It still begins with `vagueRefinementPreference`, not free-form style completion. | Yes. `open-not-locked` and `restrained-refinement` remain the things the user can continue to tune. | Yes. Proposal variants and vague-continuation feedback still act on “how to remain open while tightening refinement”. | Yes. New supervision mainly prevents this case from being flattened into pure vague classification. |
| `花叶意向，但不要太满` | Yes. It still begins with mixed composition under density constraint. | Yes. `airy-breathing` and `botanical-intent` remain the product-facing semantic objects. | Yes. The proposal logic remains “breathing vs botanical spread”, not parameter collection. | Yes. Auxiliary supervision clarifies anti-overcrowding and anti-literalization but does not become the frontstage target. |
| `石头肌理但别太硬` | Yes. It still begins with `softMineralTexture`, not a generic material preset. | Yes. `mineral-surface-soft` and `mineral-density-softened` remain the handles the user would adjust. | Partially but sufficiently. This case has package and feedback supervision centered on the same softened-mineral reading; even where response-plan coverage is lighter, the anchor stays unchanged. | Yes. The supervision layer only explains why “softened mineral” is the intended reading and what should be suppressed. |

Back-check conclusion:

- the new supervision layer is currently still subordinate
- the core cases still train the Task 12-13 mainline
- no current case suggests that evidence or association labels have already replaced the package/proposal/feedback chain as the true target

---

## 8. Mainline Conclusion

The semantic mainline established by Task Cards 12-20 is:

`bounded interpretation -> user-facing handles -> weighted composition continuation -> natural feedback re-entry -> anti-literalized next-turn adjustment`

Everything after Task 13 must still be judged by whether it thickens that chain.

This means:

- dataset work is valid when it makes those objects more learnable
- supervision additions are valid when they explain or stabilize those objects
- pilot and baseline work are valid when they reveal where those objects are still under-supervised

It does not mean:

- every new field becomes a new training center
- every schema addition deserves equal weight
- every richer description is automatically closer to the product goal
