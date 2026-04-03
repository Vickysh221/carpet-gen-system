# Semantic Retrieval Evaluation

Date: 2026-04-03

## Summary

This pass evaluated poetic / image-like Chinese expressions against the shipping carpet intent intake stack, using a real batch run over 32 queries.

Headline result:

- Strong: 25 / 32
- Medium: 0 / 32
- Weak: 0 / 32
- Miss: 7 / 32

Group split:

- Poetic atmospheric: 8 / 8 strong
- Explicit motif: 4 / 8 strong, 4 / 8 miss
- Mixed: 8 / 8 strong
- Edge / noisy: 5 / 8 strong, 3 / 8 miss

The system is already good at poetic atmospheric language and at combining two known poetic atoms in one sentence. It is still weak on explicit motif phrases that do not map to an existing poetic atom, on negated / contrastive phrasing, and on imagistic-but-unregistered expressions.

## Test Methodology

Executed code:

- Runner: `src/features/entryAgent/__tests__/semanticRetrievalEvalRunner.ts`
- Entrypoint: `scripts/run-semantic-retrieval-eval-2026-04-03.mjs`
- Runtime path used for scored results:
  - `analyzeEntryText`
  - `buildIntentSemanticMappingFromAnalysis`

Command run:

```bash
node scripts/run-semantic-retrieval-eval-2026-04-03.mjs --json-out /tmp/semantic-retrieval-evaluation-2026-04-03.json
```

Scoring rubric used in the runner:

- `strong`: two expected mappings hit, or one expected mapping hit plus strong downstream slot coverage
- `medium`: one expected mapping hit or expected pattern keyword surfaced
- `weak`: no expected hit, but some meaningful semantic state still surfaced
- `miss`: no expected hit and fallback questioning took over

Important runtime note:

- I also attempted to run the local dense retrieval helper at `backend/app/services/bge_m3_retrieval.py`.
- In this environment it aborts with `OMP: Error #179: Function Can't open SHM2 failed`.
- Because of that, the scored evaluation below uses the shipping TypeScript intake path rather than the BGE-M3 Python retrieval path.

## Candidate Pools Used

Executable in this pass:

- `src/features/entryAgent/poeticMappings.ts`: 37 poetic mappings
- `src/features/entryAgent/openingOptionRegistry.ts`: 25 opening options used downstream for questioning / slot interpretation

Prepared but not executable in this environment:

- `src/features/entryAgent/semanticRetrieval.ts`: 69 dense-retrieval candidates total
- Composition:
  - 37 poetic mappings
  - 25 opening options
  - 7 explicit motifs

Practical implication:

- The current scored pass measures real semantic intake coverage for poetic expressions.
- It does not yet measure the dense explicit-motif retrieval path end-to-end, because that backend helper is currently blocked locally.

## Test Queries

### 1. Poetic Atmospheric Queries

| ID | Query | Matched | Result | Notes |
| --- | --- | --- | --- | --- |
| A1 | 天青色等烟雨 | 烟雨, 天青 | Strong | Dual hit; downstream pattern resolves to `cloud-mist` cleanly. |
| A2 | 月白风清，像有一点清辉 | 月白, 清辉 | Strong | Dual hit; good color/impression capture, but pattern drifts to `light-trace`. |
| A3 | 山岚一样轻轻浮着 | 山岚 | Strong | Single poetic atom is enough to produce stable `cloud-mist` semantics. |
| A4 | 雪落后的寂静感 | 雪 | Strong | Good atmospheric compression into calm / abstract / blended. |
| A5 | 凌晨四点街灯下的雪 | 凌晨四点街灯下的雪, 雪 | Strong | Complex imagistic line works well; follow-up question is specific. |
| A6 | 雨落在旧玻璃上那种朦胧 | 雨落在旧玻璃上 | Strong | Excellent registered long-form phrase hit. |
| A7 | 旧木头被太阳晒过的温度 | 旧木头被太阳晒过 | Strong | Captured well, though pattern key drifts toward `stone-texture`. |
| A8 | 冬天太阳照在冷石头上 | 冬天太阳照在冷石头上 | Strong | Stable registered phrase hit with useful follow-up. |

### 2. Explicit Motif Queries

| ID | Query | Matched | Result | Notes |
| --- | --- | --- | --- | --- |
| B1 | 想要竹影 | 竹影 | Strong | Exact atom hit plus `botanical` pattern intent. |
| B2 | 有荷花在风里摇曳的感觉 | - | Miss | Lotus-like motif not covered by shipping TS intake path. |
| B3 | 一点孤帆远影 | - | Miss | Sail / distant-boat imagery does not bridge to `云帆`. |
| B4 | 水波纹慢慢散开 | 水波 | Strong | Good direct mapping into `water-wave`. |
| B5 | 暮色里的灯火 | 灯火, 暮色 | Strong | Surface hit is good, but key element drifts to `cloud-mist` instead of `light-trace`. |
| B6 | 石头肌理但别太硬 | - | Miss | Literal texture language does not bridge to stone-themed poetic mapping. |
| B7 | 花叶意向，不要大朵花 | - | Miss | Explicit floral / botanical intent not recognized by this path. |
| B8 | 松风掠过的针叶感 | 松风 | Strong | Good atmospheric-to-botanical transfer. |

### 3. Mixed Queries

| ID | Query | Matched | Result | Notes |
| --- | --- | --- | --- | --- |
| C1 | 烟雨里有一点竹影 | 烟雨, 竹影 | Strong | Strong composition of atmosphere + motif. |
| C2 | 月白底上浮一层水波 | 月白, 水波 | Strong | Dual hit with stable `water-wave` pattern intent. |
| C3 | 冷石头上落了一点晨曦 | 晨曦 | Strong | Only partial hit; still enough for usable downstream state. |
| C4 | 暮色灯火，但整体要克制 | 灯火, 暮色 | Strong | Registered atoms dominate; explicit “克制” does not materially redirect interpretation. |
| C5 | 山岚和云帆一起，留白多一点 | 山岚, 云帆 | Strong | Multi-atom composition works well. |
| C6 | 竹影里带一点清辉 | 竹影, 清辉 | Strong | Good combination of botanical linework + faint light. |
| C7 | 夜色水波，不要太具象 | 夜色, 水波 | Strong | Dual hit works, but pattern again drifts to `cloud-mist`. |
| C8 | 春水初生，像有一点花叶 | 春水初生 | Strong | Good water-side atmosphere hit, but floral aspect is not recovered. |

### 4. Edge / Noisy Cases

| ID | Query | Matched | Result | Notes |
| --- | --- | --- | --- | --- |
| D1 | 不要酒店大堂感，要暮色灯火 | 灯火, 暮色 | Strong | Positive anchor dominates even with a negated space phrase. |
| D2 | 别太花，别太亮，像风从松林里过 | - | Miss | Negation is recognized, but imagistic motif recovery fails. |
| D3 | 不是儿童房那种可爱花花草草 | - | Miss | Negative floral language does not recover a clean semantic anchor. |
| D4 | 我也说不清，像下雨前五分钟的空气 | - | Miss | Vivid but unregistered atmospheric metaphor collapses to generic fallback. |
| D5 | 想要高级，但不是金尊也不是锦 | 金尊, 锦 | Strong | Reverse-polarity problem: negated anchors still get treated as positive hits. |
| D6 | 类似天青，但别冷到像医院 | 天青 | Strong | Good base hit, but negated “hospital-like cold” is not specifically modeled. |
| D7 | 有点云雾，但不要做成海洋主题 | 云雾 | Strong | Positive atom survives noise; `cloud-mist` routing is stable. |
| D8 | 我想要那种 quiet luxury，但像旧木头晒过 | 旧木头被太阳晒过 | Strong | English phrase is ignored; Chinese poetic anchor carries the case. |

## Top Retrieval Observations

1. Registered poetic atoms are already strong.
   Inputs like `天青色等烟雨`, `月白风清，像有一点清辉`, `凌晨四点街灯下的雪`, `雨落在旧玻璃上那种朦胧` all produced stable downstream color / impression / pattern / presence movement.

2. Composition of two known atoms works unusually well.
   `烟雨 + 竹影`, `月白 + 水波`, `山岚 + 云帆`, `竹影 + 清辉` all composed without collapsing into generic fallback.

3. Explicit motif language remains the largest gap.
   `荷花`, `孤帆`, `石头肌理`, `花叶意向` all missed when phrased literally rather than through an already-registered poetic mapping.

4. Pattern semantics show drift even on strong hits.
   `暮色里的灯火` and `夜色水波，不要太具象` both hit their poetic atoms, but the system still routed pattern intent toward `cloud-mist` instead of the more precise `light-trace` or `water-wave`.

5. Negation handling is unreliable.
   `想要高级，但不是金尊也不是锦` still positively activates `金尊` and `锦`. This is a clear polarity bug, not a minor ranking issue.

6. On misses, fallback questioning becomes generic very quickly.
   Most misses collapsed to the same `patternTendency` clarification instead of preserving the original imagery and asking a narrower follow-up.

## Strong / Medium / Weak Cases

Strong cases:

- All 8 poetic atmospheric cases
- B1, B4, B5, B8
- All 8 mixed cases
- D1, D5, D6, D7, D8

Medium cases:

- None under the current rubric

Weak / miss cases:

- B2 `有荷花在风里摇曳的感觉`
- B3 `一点孤帆远影`
- B6 `石头肌理但别太硬`
- B7 `花叶意向，不要大朵花`
- D2 `别太花，别太亮，像风从松林里过`
- D3 `不是儿童房那种可爱花花草草`
- D4 `我也说不清，像下雨前五分钟的空气`

## Recurring Failure Patterns

### 1. Literal motif phrases do not bridge into poetic space

Symptoms:

- `荷花`
- `孤帆`
- `石头肌理`
- `花叶意向`

Interpretation:

- The current TS intake path is strong when the user says a registered poetic atom.
- It is weak when the user says a literal object / motif and expects the system to infer the nearby poetic family.

### 2. Negation is mostly ignored after anchor detection

Symptoms:

- `不是金尊也不是锦` still fires `金尊` and `锦`
- `别太花，别太亮` and `不是儿童房那种可爱花花草草` do not preserve negative intent cleanly

Interpretation:

- The system has positive anchor capture, but not anchor suppression or polarity reversal.

### 3. Some strong hits still route to over-generic pattern keys

Symptoms:

- `暮色里的灯火` -> `cloud-mist`
- `夜色水波，不要太具象` -> `cloud-mist`
- `旧木头被太阳晒过的温度` -> `stone-texture`

Interpretation:

- The poetic mapping layer is firing, but downstream pattern synthesis still over-favors a small set of generic atmospheric keys.

### 4. Fallback questions lose the user’s imagery

Symptoms:

- Several misses produce essentially the same `patternTendency` clarification

Interpretation:

- Once no direct poetic mapping fires, the system drops too much of the original image language instead of converting it into a structured comparison question.

## Recommendations For Next Iteration

1. Add an explicit motif-to-poetic bridge before fallback.
   Start with the observed misses: `荷花/莲`, `孤帆/帆影`, `花叶`, `石纹/石头肌理`, `松林`, `下雨前的空气`.

2. Add negation-aware anchor suppression.
   Phrases like `不是 X`, `别太 X`, `不要做成 X` should reduce or block positive activation of `X`.

3. Separate atmospheric pattern keys more cleanly.
   `light-trace`, `water-wave`, `cloud-mist`, `stone-texture`, `botanical` need stronger downstream disambiguation once multiple atoms are present.

4. Preserve imagery in fallback questioning.
   For example, `下雨前五分钟的空气` should prompt around `潮气 / 压低的天空 / 空气感 / 雾感`, not immediately collapse to generic pattern complexity questions.

5. Re-enable dense retrieval in local dev.
   Fix the `bge_m3_retrieval.py` OpenMP SHM runtime issue so the 69-candidate dense retrieval pool can be evaluated directly.

## Prioritized Action List

1. Fix negation polarity before expanding vocabulary. The `不是金尊也不是锦` behavior is the most dangerous regression because it produces the opposite of user intent.
2. Add a small motif bridge table for the failed explicit cases: lotus, sail, floral/botanical, stone texture, pre-rain air.
3. Tighten downstream pattern routing so `灯火` prefers `light-trace` and `水波` prefers `water-wave` even inside mixed inputs.
4. Replace the generic fallback `patternTendency` question with imagery-preserving prompts when the input is clearly poetic but currently unregistered.
5. After the local OpenMP issue is resolved, rerun the same 32-case bundle through `buildSemanticRetrievalCandidates()` + BGE-M3 and compare against this TS baseline.

## Files Added / Changed For This Evaluation

- Added `scripts/run-semantic-retrieval-eval-2026-04-03.mjs`
- Added `src/features/entryAgent/__tests__/semanticRetrievalEvalRunner.ts`
- Added `docs/semantic-retrieval-evaluation-2026-04-03.md`
