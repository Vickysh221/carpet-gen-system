---
name: frontstage-semantic-anchor-guardrails
description: Use when working on frontstage dataset expansion, supervision layers, curation, pilots, baselines, or training-readiness tasks. This skill keeps work anchored to the established semantic mainline: FrontstageSemanticPackage -> FrontstageResponsePlan -> ProposalFeedbackSignal -> re-entry, and prevents drift toward new schema-centered or label-centered objectives.
---

# Frontstage Semantic Anchor Guardrails

Use this skill whenever a task touches:

- `datasets/frontstage/**`
- `src/features/entryAgent/**`
- frontstage package / response-plan / feedback / closed-loop supervision
- package expansion, supervision-layer addition, pilot refresh, baseline evaluation

## Core rule

Keep later work anchored to this chain:

`text -> interpretationDomain / domainConfidence -> interpretationHandles -> compositionAxes / compositionProposals -> refinementPrompt -> ProposalFeedbackSignal -> re-entry`

Do not let new fields, richer schema, or cleaner bookkeeping replace the existing product objects.

## Non-negotiable anchors

- `interpretationDomain` and `domainConfidence` remain the gate for correct reading and frontstage commitment.
- `interpretationHandles` remain the main user-facing semantic object.
- `compositionAxes`, `compositionProposals`, and `refinementPrompt` remain responsible for weighted blending, not binary disambiguation.
- `ProposalFeedbackSignal` remains feedback-over-context, not isolated label prediction.
- `misleadingPaths` remain part of intended ability, not optional cleanup.

## What auxiliary layers may do

Allowed:

- explain why a domain or handle holds
- preserve association hierarchy before handle compression
- make package-to-proposal translation more legible

Not allowed:

- becoming more important than `interpretationHandles`
- turning package training into generic extraction
- replacing proposal blending with binary choice logic
- disconnecting feedback from previous package / response-plan context

## Required task check

Before implementing a new task, answer:

1. Which existing anchor does this task serve?
2. Which chain segment does it strengthen?
3. Does it preserve `interpretationHandles` as the main frontstage object?
4. Does it keep feedback attached to previous package / proposal context?
5. Could it accidentally create a new training center?
6. Which of the six core cases will validate it?

If these answers are unclear, tighten the task before editing code or data.

## Required opening block for future task cards

Future task cards should restate:

1. The semantic mainline is `FrontstageSemanticPackage -> FrontstageResponsePlan -> ProposalFeedbackSignal -> re-entry`.
2. `interpretationDomain` and `interpretationHandles` remain the primary package anchors.
3. `compositionProposals` remain blendable, not binary.
4. `ProposalFeedbackSignal` remains feedback-over-context.
5. New supervision layers may explain anchors, but may not replace them.

## Core-case validation

Use these six cases as a minimum back-check set:

- `薰衣草的芳香`
- `加州沙滩和柠檬叶的香气`
- `烟雨里有一点竹影`
- `还不确定，想高级一点`
- `花叶意向，但不要太满`
- `石头肌理但别太硬`

For each relevant task, confirm:

- the case still serves `interpretationDomain` first
- supervision still ultimately serves `interpretationHandles`
- proposal / feedback / re-entry still point back to the same chain
- any new supervision layer supports existing anchors rather than replacing them

## Read these references when needed

- For the semantic anchor map and case back-check, read `references/anchor-map.md`.
- For what counts as drift, next-wave organization, and task-card guardrails, read `references/guardrails.md`.
- For package sample expansion rules, read `references/package-curation.md`.

