# Frontstage Curation Notes v0.2

Date: 2026-04-04

## This Round Focus

This pass does not expand the frontstage system itself. It cleans and extends the dataset so the current assets are closer to first-pass training use.

Primary targets:

- expand `closed-loop` coverage from 2 to 6 samples
- clean corrected-domain continuation samples
- reduce response-plan field drift between `title`, `summary`, `dominantHandles`, and `suppressedHandles`

## Audit Findings From v0.1

### 1. Closed-loop coverage was too thin

`closed-loop/gold-v0.1.jsonl` had only 2 samples. That was enough to prove the format, but not enough to supervise:

- corrected-domain continuation
- proposal blending
- mixed imagery continuation
- vague preference continuation

### 2. Runtime-shaped corrected-domain plans leaked into gold

Some next-turn plans still looked like direct planner regenerations:

- `先留 X，再带 Y`
- summary text that over-explained ranking rather than reading like a curated frontstage proposal
- dominant handles already switched domains while titles still felt mechanically regenerated

### 3. Response-plan coverage had a gap around curated continuation style

The base response-plan file was usable, but it lacked:

- an explicit corrected-domain target plan sample
- a cleaned `花叶意向，但不要太满` response-plan sample with no placeholder handle drift

## What Was Cleaned In v0.2

### Corrected-domain cleanup

Reworked corrected-domain supervision so the new domain is reflected coherently across:

- proposal title
- proposal summary
- dominant handles
- suppressed handles
- reply snapshot

Main cleaned samples:

- `rsp-005`
- `cl-001`

### Closed-loop expansion

Added four new closed-loop gold samples:

- `cl-003`: mixed imagery continuation with select + reduce + boost
- `cl-004`: mixed imagery continuation with blended proposals
- `cl-005`: mixed imagery continuation with boost atmosphere + reduce trace
- `cl-006`: vague preference continuation

### Response-plan cleanup

Added or curated:

- `rsp-005`: corrected-domain floral/herbal continuation target
- `rsp-006`: cleaned `花叶意向，但不要太满` response plan

## Remaining Edge Cases

These are still acceptable residuals for v0.2:

- some `seed` exports still mirror runtime emphasis language more directly than curated gold
- parser coverage for natural blend phrasing is still narrower than ideal
- some continuation packages still inherit handle inventories that are coarser than a final train-time target would want

## Next-Round Cleanup Candidates

- add more closed-loop samples for `softMineralTexture`
- widen vague-preference continuation coverage beyond one case
- add script-level linting for proposal field alignment, not only JSONL structure
