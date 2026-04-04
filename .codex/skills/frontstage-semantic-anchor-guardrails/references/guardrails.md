# Guardrails Reference

## What future work must continue to orbit

`text -> interpretationDomain / domainConfidence -> interpretationHandles -> compositionAxes / compositionProposals -> refinementPrompt -> ProposalFeedbackSignal -> re-entry`

## What counts as mainline extension

- package-supporting supervision that explains existing anchors
- package sample expansion that still trains the same package object
- feedback and closed-loop coverage that still modifies the same handle / proposal system
- baseline work that evaluates domain, handles, corrected-domain, boost/reduce, and re-entry

## What counts as drift

- new fields become more important than `interpretationHandles`
- package training silently becomes generic extraction
- proposal logic stops serving weighted blending
- feedback is treated as isolated label prediction
- schema expansion no longer serves frontstage continuation

## Mandatory checklist for every new task

1. Which existing semantic anchor does this task serve?
2. Which chain segment does it strengthen?
3. Does it preserve `interpretationHandles` as the main user-facing object?
4. Does it keep feedback attached to previous package / proposal context?
5. Could it accidentally create a new training center?
6. Which core cases will validate it?
7. What failure mode would prove drift?

## Required opening block for future task cards

Restate:

1. The semantic mainline is `FrontstageSemanticPackage -> FrontstageResponsePlan -> ProposalFeedbackSignal -> re-entry`.
2. `interpretationDomain` and `interpretationHandles` remain the primary package anchors.
3. `compositionProposals` remain blendable, not binary.
4. `ProposalFeedbackSignal` remains feedback-over-context.
5. New supervision layers may explain anchors, but may not replace them.

## Recommended next-wave organization

- Pass A: package expansion against existing anchors
- Pass B: feedback and closed-loop strengthening
- Pass C: anchor-based evaluation refresh

Avoid organizing the next wave around free-form schema completion.

