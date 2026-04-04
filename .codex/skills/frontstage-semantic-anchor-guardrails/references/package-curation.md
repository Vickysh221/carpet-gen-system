# Package Curation Reference

Use this when expanding `datasets/frontstage/package/**`.

## Every new package sample must still primarily supervise

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `compositionAxes`
- `misleadingPaths`

## Minimum auxiliary supervision expectation

- `evidenceCues.domain` with at least 2 supporting cues
- `evidenceCues.handles` covering the main handle
- `associationReadings.primary` with at least 1 item
- `associationReadings.secondary` with at least 1 item
- `designTranslationHints.baseLayer` with at least 1 item
- `designTranslationHints.traceLayer` with at least 1 item
- `designTranslationHints.suppressedLiteralization` with at least 1 item

## Admission test

A sample should not enter gold if:

- it has domain / handles but no evidence
- it has handles but cannot explain why they hold
- it has association language but no primary / secondary distinction
- it has translation flavor but no base / trace / suppression structure
- it has misleading paths but no reason those errors are likely

## Curator question set

1. Why is this the right `interpretationDomain`?
2. Why are these the main `interpretationHandles`?
3. What is the primary association?
4. What is the secondary association?
5. What becomes base and what remains trace?
6. What must not stand up or literalize?
