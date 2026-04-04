# Anchor Map Reference

## Semantic achievements by task segment

### Tasks 12-13

These tasks changed the center from:

`route / slot / follow-up question`

to:

`interpretation -> frontstage semantic package -> composition proposals -> refinement -> feedback re-entry`

Primary objects established:

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `compositionAxes`
- `misleadingPaths`
- `compositionProposals`
- `refinementPrompt`
- `ProposalFeedbackSignal`

### Tasks 14-16

These tasks made the same chain trainable through:

- `package`
- `response-plan`
- `feedback-signals`
- `closed-loop`

They did not introduce a new semantic center.

### Tasks 17-19

These tasks changed the learnability boundary by allowing auxiliary supervision:

- `evidenceCues`
- `associationReadings`
- `designTranslationHints`

These are subordinate support layers, not replacement anchors.

## Primary anchors

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `compositionAxes`
- `compositionProposals`
- `refinementPrompt`
- `ProposalFeedbackSignal`
- `misleadingPaths`

## Secondary support layers

- `evidenceCues`
- `associationReadings`
- `designTranslationHints`

These are valid only if they explain or stabilize the primary anchors.

## Six-core-case back-check summary

All six current core package cases still align to the same mainline:

- `薰衣草的芳香`
- `加州沙滩和柠檬叶的香气`
- `烟雨里有一点竹影`
- `还不确定，想高级一点`
- `花叶意向，但不要太满`
- `石头肌理但别太硬`

Current conclusion:

- package still starts from `interpretationDomain`
- user-facing continuation still centers on `interpretationHandles`
- response-plan and feedback still operate over the same semantic objects
- Task 19's new supervision layer currently supports anchors instead of replacing them

