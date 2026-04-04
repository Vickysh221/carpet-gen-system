# Minimal Supervision Layer Design v0.1

Date: 2026-04-04

## 1. Why Add This Layer

Task 18 concluded that the current frontstage package schema is usable but too compressed in three places:

- evidence for why a domain / handle / misleading path was chosen
- association structure beyond final handle labels
- design translation hints beyond relation slogans

If we expand package samples without fixing this, the next training pass is likely to learn:

- domain classification shortcuts
- handle phrase extraction
- thin relation slogans instead of design translation

So this round adds a narrow auxiliary supervision layer rather than rewriting the runtime package object.

## 2. Design Principle

Do not replace the current package object.

Do not change the runtime `FrontstageSemanticPackage` contract yet.

Instead, attach a dataset-only auxiliary supervision object next to the package target:

```json
{
  "output": {
    "package": { "...": "existing package object" },
    "supervision": {
      "evidenceCues": { "...": "why this package exists" },
      "associationReadings": { "...": "what imagery structure was activated" },
      "designTranslationHints": { "...": "how this should enter the pattern" }
    }
  }
}
```

This preserves backward compatibility for:

- existing package baselines
- existing pilot snapshot logic
- current runtime object shape

## 3. Why These Three Layers

### 3.1 `evidenceCues`

This is the highest-priority addition.

It answers:

- why the domain is justified
- why each handle is justified
- why a misleading path should be suppressed

It is the smallest high-leverage fix because it adds rationale without changing the output target.

### 3.2 `associationReadings`

This prevents association from collapsing entirely into handle extraction.

It distinguishes:

- `primary`
- `secondary`
- `nearbyButSuppressed`

This is intentionally simple. It is not a full ontology.

### 3.3 `designTranslationHints`

This gives the package task a minimal bridge toward pattern treatment.

It currently only carries:

- `baseLayer`
- `traceLayer`
- `suppressedLiteralization`

That is enough to express:

- what should become the main atmospheric or structural base
- what should remain trace
- what should not stand up as literal object

## 4. Why Not Rewrite The Package Schema

Because the current package object already carries the right outer form:

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `compositionAxes`
- `misleadingPaths`

The issue is not that these fields are wrong.
The issue is that they are too compressed to serve as the only supervision target for future scale-up.

So the least risky move is:

- keep the package object
- enrich the dataset around it
- validate whether the new auxiliary layer helps before touching runtime contracts

## 5. Scope For This Round

This round backfills the auxiliary layer on the core package cases:

- `薰衣草的芳香`
- `加州沙滩和柠檬叶的香气`
- `烟雨里有一点竹影`
- `还不确定，想高级一点`

And also fills the current extended set:

- `花叶意向，但不要太满`
- `石头肌理但别太硬`

## 6. What This Layer Should Help With

After this addition, a package sample can answer four questions more directly:

1. Why does this domain hold?
2. Why are these handles the user-facing semantic center?
3. Which associations are primary versus secondary?
4. Why should this idea become base / trace / suppression in design terms?

That makes the next Task 17 expansion safer.

## 7. Decision For The Next Task 17 Pass

After this layer lands:

**Task 17 may continue package sample expansion, but the new package samples should grow this auxiliary supervision together with the existing package object.**

In other words:

- do continue expanding intent description samples
- do not expand only the old compressed package target
- require new samples to include at least `evidenceCues`
- strongly prefer adding `associationReadings` and `designTranslationHints` for core or high-value cases

## 8. What Is Deliberately Deferred

This round does not force an explicit positive `associationPolicy` field yet.

Reason:

- `misleadingPaths` already provides negative boundary control
- evidence and association structure are the more urgent missing pieces

`associationPolicy` should remain the next optional layer if future sample growth still shows over-literalization or under-expansion.
