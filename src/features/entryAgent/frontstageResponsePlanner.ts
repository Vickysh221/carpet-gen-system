import type {
  CompositionProposal,
  FrontstageResponsePlan,
  FrontstageSemanticPackage,
  InterpretationHandle,
  ProposalFeedbackSignal,
  RefinementPrompt,
} from "./types";

function topHandlesByKind(input: {
  handles: InterpretationHandle[];
  kind: InterpretationHandle["kind"];
}) {
  return input.handles
    .filter((handle) => handle.kind === input.kind)
    .sort((left, right) => (right.plannerWeight ?? 0) - (left.plannerWeight ?? 0));
}

function sortedHandles(handles: InterpretationHandle[]) {
  return [...handles].sort((left, right) => (right.plannerWeight ?? 0) - (left.plannerWeight ?? 0));
}

function unique(items: string[]) {
  return [...new Set(items)];
}

function shortenHandleLabel(handle: InterpretationHandle | undefined, fallback: string) {
  if (!handle?.label) return fallback;
  return handle.label
    .replace(/，.*/u, "")
    .replace(/。.*/u, "")
    .replace(/只留一点/u, "留一点")
    .replace(/轻轻/u, "")
    .replace(/不急着长成花形/u, "")
    .trim();
}

function buildRegeneratedTitle(input: {
  dominantHandles: string[];
  handles: InterpretationHandle[];
}) {
  const handleByLabel = new Map(input.handles.map((handle) => [handle.label, handle]));
  const lead = shortenHandleLabel(handleByLabel.get(input.dominantHandles[0]), "先把重点放前面");
  const accent = input.dominantHandles[1]
    ? shortenHandleLabel(handleByLabel.get(input.dominantHandles[1]), "再把第二层带出来")
    : undefined;
  return buildProposalTitle({
    lead: `先留 ${lead}`,
    accent: accent ? `再带 ${accent}` : undefined,
  });
}

function buildRegeneratedSummary(input: {
  dominantHandles: string[];
  suppressedHandles: string[];
  handles: InterpretationHandle[];
}) {
  const handleByLabel = new Map(input.handles.map((handle) => [handle.label, handle]));
  const lead = shortenHandleLabel(handleByLabel.get(input.dominantHandles[0]), "重点");
  const second = input.dominantHandles[1]
    ? shortenHandleLabel(handleByLabel.get(input.dominantHandles[1]), "第二层")
    : undefined;
  const suppressed = input.suppressedHandles[0]
    ? shortenHandleLabel(handleByLabel.get(input.suppressedHandles[0]), "其他痕迹")
    : undefined;

  if (second && suppressed) {
    return `${lead} 放前面，${second} 做第二层，${suppressed} 先收在后面，整轮会更贴着这条重点走。`;
  }
  if (second) {
    return `${lead} 放前面，${second} 做第二层，整轮先按这条主次关系往前推。`;
  }
  if (suppressed) {
    return `${lead} 放前面，${suppressed} 先收住，整轮先把主语气拉清楚。`;
  }
  return `${lead} 放前面，整轮先顺着这层意思往前推。`;
}

function scoreHandleLabels(input: {
  proposal: CompositionProposal;
  handles: InterpretationHandle[];
  boostedLabels: string[];
  reducedLabels: string[];
}) {
  const scores = new Map<string, number>();
  const handleByLabel = new Map(input.handles.map((handle) => [handle.label, handle]));

  for (const handle of input.handles) {
    scores.set(handle.label, handle.plannerWeight ?? 0.5);
  }
  for (const label of input.proposal.dominantHandles) {
    scores.set(label, (scores.get(label) ?? 0) + 0.8);
  }
  for (const label of input.proposal.suppressedHandles ?? []) {
    scores.set(label, (scores.get(label) ?? 0) - 0.5);
  }
  for (const label of input.boostedLabels) {
    scores.set(label, (scores.get(label) ?? 0) + 1.2);
  }
  for (const label of input.reducedLabels) {
    scores.set(label, (scores.get(label) ?? 0) - 1.4);
  }

  return [...scores.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return (handleByLabel.get(left[0])?.plannerWeight ?? 0) - (handleByLabel.get(right[0])?.plannerWeight ?? 0);
    })
    .map(([label]) => label);
}

function buildProposalEmphasisState(input: {
  proposal: CompositionProposal;
  handles: InterpretationHandle[];
  boostedLabels: string[];
  reducedLabels: string[];
}) {
  const boostedSet = new Set(input.boostedLabels);
  const reducedSet = new Set(input.reducedLabels);
  const rankedLabels = scoreHandleLabels(input);

  const dominantHandles = rankedLabels
    .filter((label) => !reducedSet.has(label))
    .slice(0, 2);

  const suppressedHandles = unique([
    ...input.reducedLabels,
    ...(input.proposal.suppressedHandles ?? []),
    ...rankedLabels.slice(2),
  ])
    .filter((label) => !dominantHandles.includes(label) && !boostedSet.has(label))
    .slice(0, 2);

  const title = buildRegeneratedTitle({
    dominantHandles,
    handles: input.handles,
  });
  const summary = buildRegeneratedSummary({
    dominantHandles,
    suppressedHandles,
    handles: input.handles,
  });
  const blendNotes = unique([
    ...(input.boostedLabels[0] ? [`这一轮先放大 ${input.boostedLabels[0]}`] : []),
    ...(input.reducedLabels[0] ? [`先把 ${input.reducedLabels[0]} 收后一点`] : []),
    ...(input.proposal.blendNotes ?? []),
  ]).slice(0, 3);

  return {
    dominantHandles,
    suppressedHandles,
    title,
    summary,
    blendNotes,
  };
}

function pickReplySnapshot(input: { pkg: FrontstageSemanticPackage }) {
  const { pkg } = input;
  const handles = sortedHandles(pkg.interpretationHandles);
  const first = handles[0]?.label;
  const second = handles[1]?.label;
  const third = handles[2]?.label;
  const hasScent = pkg.interpretationHandles.some((item) => item.kind === "scent");
  const hasPresence = pkg.interpretationHandles.some((item) => item.kind === "presence");

  if (pkg.interpretationDomain === "floralHerbalScent") {
    return `你这个方向很好，不是花形先跳出来，而是 ${first ?? "一层轻轻浮出来的花香"}、${second ?? "一层淡淡的香气气候"}，再加上 ${third ?? "香气退进空气里的散开感"} 一起慢慢成立。`;
  }

  if (pkg.interpretationDomain === "mixedImageryComposition") {
    if (hasScent) {
      return `这个画面我会拿得很轻，亮的空气在前面，${second ?? "那层痕迹"} 只够你隐约闻到一点，${third ?? "剩下那层气息"} 反而把味道留住了。`;
    }
    if (hasPresence) {
      return `这句的分寸特别好，${first ?? "那层湿润空气"} 已经够了，${second ?? "那一点影痕"} 只要贴着边走，就很美。`;
    }
    return `这句话最难得的，是 ${first ?? "那层空气"} 和 ${second ?? "那层痕迹"} 都不急着往前抢，${third ?? "中间那点分寸"} 反而让它成立了。`;
  }

  if (pkg.interpretationDomain === "coastalAiryBrightness") {
    return `我反而会先把 ${first ?? "那层晒白又通透的空气"} 放前面，再让 ${second ?? "更轻的一层痕迹"} 慢慢出来。`;
  }

  if (pkg.interpretationDomain === "moistThresholdAtmosphere") {
    return `这类感觉最怕说重了，留住 ${first ?? "那层将落未落的空气"}，再带一点 ${second ?? "慢慢浮出来的表面天气"}，味道就对了。`;
  }

  if (pkg.interpretationDomain === "softMineralTexture") {
    return `这个方向我会拿捏得更软一点，让 ${first ?? "那层矿物感的表面"} 留着，同时把 ${second ?? "边缘放软的意思"} 带进来。`;
  }

  if (pkg.interpretationDomain === "vagueRefinementPreference") {
    return `这里倒不用急着找具体图样，先把 ${first ?? "那种还没锁死的方向"} 和 ${second ?? "更克制一点的高级感"} 抓住，会更稳。`;
  }

  return `这句话里已经有味道了，${first ?? "几层还在靠近彼此的意思"} 里，${second ?? "那个比较清楚的方向"} 其实很值得先保住。`;
}

function buildOptionalDomainCheck(input: { pkg: FrontstageSemanticPackage }) {
  const { pkg } = input;
  if (pkg.domainConfidence === "high") {
    return undefined;
  }

  if (pkg.domainConfidence === "medium") {
    return "要是我刚才抓偏了，你就把我往你更想要的那层轻轻拨回来。";
  }

  return "这里还有几层意思贴得很近，我先不想替你说满，你只要告诉我哪层该更靠前就行。";
}

function buildProposalTitle(input: {
  lead: string;
  accent?: string;
  suffix?: string;
}) {
  const parts = [input.lead, input.accent, input.suffix].filter(Boolean);
  return parts.join("，");
}

function createProposal(input: {
  id: string;
  title: string;
  summary: string;
  dominantHandles: string[];
  suppressedHandles?: string[];
  blendNotes?: string[];
}): CompositionProposal {
  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    dominantHandles: input.dominantHandles,
    suppressedHandles: input.suppressedHandles,
    blendNotes: input.blendNotes,
  };
}

function collectFeedbackWeights(signals?: ProposalFeedbackSignal[]) {
  const recentSignals = (signals ?? []).slice(-6);
  const proposalWeights = new Map<string, number>();
  const handleWeights = new Map<string, number>();

  recentSignals.forEach((signal, index) => {
    const recency = 1 + index * 0.2;

    for (const proposalId of signal.selectedProposalIds ?? []) {
      proposalWeights.set(proposalId, (proposalWeights.get(proposalId) ?? 0) + 18 * recency);
    }
    for (const proposalId of signal.blendedProposalIds ?? []) {
      proposalWeights.set(proposalId, (proposalWeights.get(proposalId) ?? 0) + 14 * recency);
    }
    for (const handleId of signal.boostedHandles ?? []) {
      handleWeights.set(handleId, (handleWeights.get(handleId) ?? 0) + 0.16 * recency);
    }
    for (const handleId of signal.reducedHandles ?? []) {
      handleWeights.set(handleId, (handleWeights.get(handleId) ?? 0) - 0.2 * recency);
    }
  });

  return { proposalWeights, handleWeights };
}

function applyFeedbackToPackage(input: {
  pkg: FrontstageSemanticPackage;
  feedbackSignals?: ProposalFeedbackSignal[];
}) {
  const signals = input.feedbackSignals ?? [];
  if (signals.length === 0) {
    return input.pkg;
  }

  const { handleWeights } = collectFeedbackWeights(signals);

  return {
    ...input.pkg,
    interpretationHandles: input.pkg.interpretationHandles.map((handle) => {
      const plannerWeight = (handle.plannerWeight ?? 0.5) + (handleWeights.get(handle.id) ?? 0);
      return {
        ...handle,
        plannerWeight: Number(Math.max(0.1, Math.min(1, plannerWeight)).toFixed(2)),
      };
    }),
  };
}

function rerankProposalsByFeedback(input: {
  proposals: CompositionProposal[];
  feedbackSignals?: ProposalFeedbackSignal[];
  handles: InterpretationHandle[];
}) {
  const signals = input.feedbackSignals ?? [];
  if (signals.length === 0) {
    return input.proposals;
  }

  const { proposalWeights, handleWeights } = collectFeedbackWeights(signals);
  const handleLabelById = new Map(input.handles.map((handle) => [handle.id, handle.label]));

  return [...input.proposals].sort((left, right) => {
    const scoreProposal = (proposal: CompositionProposal) => {
      let score = proposalWeights.get(proposal.id) ?? 0;

      for (const [handleId, weight] of handleWeights.entries()) {
        const label = handleLabelById.get(handleId);
        if (!label) continue;
        if (proposal.dominantHandles.includes(label)) {
          score += weight > 0 ? weight * 48 : weight * 72;
        }
        if (proposal.suppressedHandles?.includes(label)) {
          score += weight > 0 ? weight * -20 : Math.abs(weight) * 32;
        }
      }
      return score;
    };

    return scoreProposal(right) - scoreProposal(left);
  });
}

function regenerateProposalByFeedback(input: {
  proposal: CompositionProposal;
  handles: InterpretationHandle[];
  feedbackSignals?: ProposalFeedbackSignal[];
}): CompositionProposal {
  const signals = input.feedbackSignals ?? [];
  if (signals.length === 0) {
    return input.proposal;
  }

  const handleById = new Map(input.handles.map((handle) => [handle.id, handle]));
  const boostedLabels = unique(
    signals.flatMap((signal) => signal.boostedHandles ?? [])
      .map((handleId) => handleById.get(handleId)?.label)
      .filter((label): label is string => Boolean(label)),
  );
  const reducedLabels = unique(
    signals.flatMap((signal) => signal.reducedHandles ?? [])
      .map((handleId) => handleById.get(handleId)?.label)
      .filter((label): label is string => Boolean(label)),
  );
  const emphasisState = buildProposalEmphasisState({
    proposal: input.proposal,
    handles: input.handles,
    boostedLabels,
    reducedLabels,
  });

  return {
    ...input.proposal,
    title: emphasisState.title,
    dominantHandles: emphasisState.dominantHandles,
    suppressedHandles: emphasisState.suppressedHandles.length > 0 ? emphasisState.suppressedHandles : undefined,
    summary: emphasisState.summary,
    blendNotes: emphasisState.blendNotes,
  };
}

function buildFloralHerbalScentProposals(pkg: FrontstageSemanticPackage): CompositionProposal[] {
  const scent = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "scent" })[0]?.label ?? "草本花香轻轻浮出来";
  const color = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "colorClimate" })[0]?.label ?? "柔紫灰的香气气候";
  const modifier = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "modifier" })[0]?.label ?? "香气融进空气里";
  const trace = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "trace" })[0]?.label ?? "植物那层只留一点轻轻的影子";

  return [
    createProposal({
      id: "proposal-floral-scent-air",
      title: "先让香气散开",
      summary: `${modifier}，${color} 淡淡铺在后面，植物那层只剩一个影子，整张图先闻得到，再慢慢看得到。`,
      dominantHandles: [scent, modifier],
      suppressedHandles: [color],
      blendNotes: ["后面可以再加一点植物痕迹", "也可以把颜色气候再收淡一点"],
    }),
    createProposal({
      id: "proposal-floral-scent-color",
      title: "让气味带一点颜色",
      summary: `${color} 在底下轻轻发开，${scent} 浮在表面，花不必看得很清楚，只要留一点靠近植物的气息就够了。`,
      dominantHandles: [color, scent],
      suppressedHandles: [modifier],
      blendNotes: ["可以往更空气一点推", "也可以往更贴近植物一点推"],
    }),
    createProposal({
      id: "proposal-floral-trace-light",
      title: "留一点植物的影子",
      summary: `${scent} 还是最前面的那层，${trace} 只在局部轻轻搭一下，让它别完全退成空气，但也别长成花田。`,
      dominantHandles: [scent, trace],
      suppressedHandles: [modifier],
      blendNotes: ["可以把痕迹再降一点", "也可以把香气再散开一点"],
    }),
  ];
}

function buildMixedImageryProposals(pkg: FrontstageSemanticPackage): CompositionProposal[] {
  const atmosphere = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "atmosphere" })[0]?.label ?? "一层空气先成立";
  const trace = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "trace" })[0]?.label ?? "一层痕迹轻轻浮出来";
  const scent = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "scent" })[0]?.label;
  const presence = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "presence" })[0]?.label;
  const feelsCoastal = Boolean(scent);
  const feelsMistTrace = Boolean(presence) && !scent;

  const atmosphereFirstTitle = feelsCoastal
    ? "把空气留在最前面"
    : feelsMistTrace
      ? "先留那层烟雨"
      : "先把底子放轻";
  const traceForwardTitle = feelsCoastal
    ? "让叶感轻轻亮一下"
    : feelsMistTrace
      ? "让竹影浮一小层"
      : "让痕迹浮一小层";
  const scentLedTitle = "让气息带着往前走";
  const lowPresenceTitle = feelsMistTrace ? "不妨让它更轻一点" : "不妨再轻一点";

  const proposals: CompositionProposal[] = [
    createProposal({
      id: "proposal-mixed-atmosphere-first",
      title: atmosphereFirstTitle,
      summary: feelsCoastal
        ? `${atmosphere} 整片舒展开来，${trace} 只在边上轻轻提一下，画面还是松的，味道却已经在里面了。`
        : `${atmosphere} 先慢慢铺开，${trace} 只在局部轻轻亮一下，画面还是安静的，只是多了一层回味。`,
      dominantHandles: [atmosphere, trace],
      suppressedHandles: scent ? [scent] : undefined,
      blendNotes: ["后面可以把痕迹再提一点", "也可以让空气更干净一点"],
    }),
    createProposal({
      id: "proposal-mixed-trace-first",
      title: traceForwardTitle,
      summary: feelsCoastal
        ? `${trace} 会比刚才更近一点，但还是贴着 ${atmosphere} 走，不会立成对象，更像空气里忽然带出的一小口清气。`
        : `${trace} 会比刚才再清楚一点，但还是贴在 ${atmosphere} 上，不会自己跳出来，像是从空气里慢慢显了一下。`,
      dominantHandles: [trace, atmosphere],
      suppressedHandles: presence ? [presence] : undefined,
      blendNotes: ["可以只提一点轮廓", "也可以让底子的空气更厚一点"],
    }),
  ];

  if (scent) {
    proposals.push(createProposal({
      id: "proposal-mixed-scent-led",
      title: scentLedTitle,
      summary: `${scent} 在最前面轻轻带一下，${atmosphere} 和 ${trace} 都往后退，画面不讲对象，讲的是那口气怎么散开。`,
      dominantHandles: [scent, atmosphere],
      suppressedHandles: [trace],
      blendNotes: ["可以再给一点叶感或影痕", "也可以把香气再往整体里融一点"],
    }));
  }

  if (presence) {
    proposals.push(createProposal({
      id: "proposal-mixed-low-presence",
      title: lowPresenceTitle,
      summary: `${presence}，所以 ${trace} 只留在快要被看见的边缘，真正留在眼前的，还是 ${atmosphere} 那层安静。`,
      dominantHandles: [atmosphere, presence],
      suppressedHandles: [trace],
      blendNotes: ["后面可以把痕迹稍微抬高", "也可以让它继续退后"],
    }));
  }

  return proposals.slice(0, 4);
}

function buildVagueRefinementProposals(pkg: FrontstageSemanticPackage): CompositionProposal[] {
  const top = sortedHandles(pkg.interpretationHandles);
  const first = top[0]?.label ?? "先保留那种克制感";
  const second = top[1]?.label ?? "方向先不要锁太死";

  return [
    createProposal({
      id: "proposal-vague-restrained",
      title: "先收着一点",
      summary: `${first}，整体先不急着长成具体对象，更多靠留白和分寸把感觉托起来。`,
      dominantHandles: [first],
      suppressedHandles: [second],
      blendNotes: ["后面可以再给一点存在感", "也可以继续保持克制"],
    }),
    createProposal({
      id: "proposal-vague-presence",
      title: "留白里带一点分量",
      summary: `${second} 还是保留着，但不会完全散掉，画面里可以慢慢浮出一点更能被感到的东西。`,
      dominantHandles: [second],
      suppressedHandles: [first],
      blendNotes: ["可以更抽象", "也可以更有一点痕迹"],
    }),
  ];
}

function buildCoastalAiryProposals(pkg: FrontstageSemanticPackage): CompositionProposal[] {
  const atmosphere = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "atmosphere" })[0]?.label ?? "先把通透空气撑起来";
  const scent = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "scent" })[0]?.label;
  const modifier = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "modifier" })[0]?.label ?? "气息贴着空气走";

  return [
    createProposal({
      id: "proposal-coastal-air-first",
      title: "先把空气放前面",
      summary: `${atmosphere}，其余味道都先贴着边走，画面不去讲海景，只讲亮度和呼吸感怎么成立。`,
      dominantHandles: scent ? [atmosphere, scent] : [atmosphere, modifier],
      suppressedHandles: scent ? [modifier] : undefined,
      blendNotes: ["可以再白一点", "也可以留一点轻轻的气息"],
    }),
    createProposal({
      id: "proposal-coastal-scent-breath",
      title: "让气息轻轻靠近",
      summary: `${modifier}，但还是被 ${atmosphere} 托着，不会变成对象或景别，更像空气里刚好路过的一口味道。`,
      dominantHandles: scent ? [modifier, atmosphere] : [atmosphere],
      suppressedHandles: scent ? [scent] : undefined,
      blendNotes: ["可以把气息再收淡一点", "也可以让空气更开一些"],
    }),
  ];
}

function buildMoistThresholdProposals(pkg: FrontstageSemanticPackage): CompositionProposal[] {
  const atmosphere = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "atmosphere" })[0]?.label ?? "先留住将落未落的空气";
  const presence = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "presence" })[0]?.label ?? "那一点存在感要贴着边";

  return [
    createProposal({
      id: "proposal-mist-threshold-air",
      title: "先留阈值空气",
      summary: `${atmosphere}，其他痕迹都收在边上，重点不是下雨场景，而是湿度快要落下来的那一刻。`,
      dominantHandles: [atmosphere, presence],
      suppressedHandles: undefined,
      blendNotes: ["可以再轻一点", "也可以让表面天气再近一点"],
    }),
    createProposal({
      id: "proposal-mist-threshold-edge",
      title: "边缘只动一点",
      summary: `${presence}，所以你会先感到空气，再慢慢发现边上有一点要出现但还没完全出现的东西。`,
      dominantHandles: [presence, atmosphere],
      suppressedHandles: undefined,
      blendNotes: ["可以继续收着", "也可以让边缘再明一点"],
    }),
  ];
}

function buildSoftMineralProposals(pkg: FrontstageSemanticPackage): CompositionProposal[] {
  const texture = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "structure" })[0]?.label ?? "保住矿物表面感";
  const modifier = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "modifier" })[0]?.label ?? "把硬度往回收";

  return [
    createProposal({
      id: "proposal-mineral-soft-surface",
      title: "保住表面感，但别硬",
      summary: `${texture}，${modifier}，整体更像温一点的密度，而不是石头被刻得很重。`,
      dominantHandles: [texture, modifier],
      suppressedHandles: undefined,
      blendNotes: ["可以再软一点", "也可以把材质感再抬一点"],
    }),
    createProposal({
      id: "proposal-mineral-muted-density",
      title: "让密度轻一点",
      summary: `${modifier} 放前面，材质感退后一点，画面会更克制，不会掉进硬朗装饰感。`,
      dominantHandles: [modifier, texture],
      suppressedHandles: undefined,
      blendNotes: ["可以更细腻一点", "也可以再保留一点纹理"],
    }),
  ];
}

function buildDefaultProposals(pkg: FrontstageSemanticPackage): CompositionProposal[] {
  const handles = sortedHandles(pkg.interpretationHandles);
  const first = handles[0]?.label ?? "先保住最前面的那层感觉";
  const second = handles[1]?.label ?? "再给第二层慢慢浮出来";
  const third = handles[2]?.label;

  return [
    createProposal({
      id: "proposal-default-1",
      title: "先把底子放稳",
      summary: `${first}，${second} 只在后面慢慢露出来，画面先稳住，再把第二层轻轻带出来。`,
      dominantHandles: [first, second],
      suppressedHandles: third ? [third] : undefined,
      blendNotes: ["后面可以把第二层再提一点"],
    }),
    createProposal({
      id: "proposal-default-2",
      title: "让第二层冒一点头",
      summary: `${second} 会更靠前一点，但还是被 ${first} 托着，不会一下跳成完整对象。`,
      dominantHandles: [second, first],
      suppressedHandles: third ? [third] : undefined,
      blendNotes: ["可以更轻", "也可以更明显"],
    }),
  ];
}

function buildCompositionProposals(input: { pkg: FrontstageSemanticPackage }): CompositionProposal[] {
  const { pkg } = input;
  const hardLabels = new Set(pkg.misleadingPaths.filter((item) => item.severity === "hard").map((item) => item.label));

  let proposals: CompositionProposal[];
  if (pkg.interpretationDomain === "floralHerbalScent") {
    proposals = buildFloralHerbalScentProposals(pkg);
  } else if (pkg.interpretationDomain === "mixedImageryComposition") {
    proposals = buildMixedImageryProposals(pkg);
  } else if (pkg.interpretationDomain === "coastalAiryBrightness") {
    proposals = buildCoastalAiryProposals(pkg);
  } else if (pkg.interpretationDomain === "moistThresholdAtmosphere") {
    proposals = buildMoistThresholdProposals(pkg);
  } else if (pkg.interpretationDomain === "softMineralTexture") {
    proposals = buildSoftMineralProposals(pkg);
  } else if (pkg.interpretationDomain === "vagueRefinementPreference") {
    proposals = buildVagueRefinementProposals(pkg);
  } else {
    proposals = buildDefaultProposals(pkg);
  }

  return proposals.filter((proposal) => {
    if (hardLabels.has("generic moist atmosphere")) {
      return !proposal.summary.includes("湿雾");
    }
    return true;
  }).slice(0, 4);
}

function buildRefinementPrompt(input: { pkg: FrontstageSemanticPackage }): RefinementPrompt {
  if (input.pkg.domainConfidence === "low") {
    return {
      mode: "domain-check",
      text: "你可以告诉我，现在更像香气本身、空气里的气候，还是只剩一点轻痕迹；也可以直接说哪层被我听偏了。",
      allowedActions: ["correct-domain", "choose-proposal", "boost-handle", "reduce-handle"],
    };
  }

  if (input.pkg.domainConfidence === "medium") {
    return {
      mode: "nudge",
      text: "你可以直接说更靠近哪一种，也可以把两种揉在一起，再告诉我哪一层想多一点、少一点。",
      allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
    };
  }

  return {
    mode: "blend",
    text: "你可以告诉我更像哪一种，或者拿两种混一下，再说哪一层该更轻、哪一层该往前一点。",
    allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle"],
  };
}

export function buildFrontstageResponsePlan(input: {
  pkg: FrontstageSemanticPackage;
  feedbackSignals?: ProposalFeedbackSignal[];
}): FrontstageResponsePlan {
  const effectivePackage = applyFeedbackToPackage({
    pkg: input.pkg,
    feedbackSignals: input.feedbackSignals,
  });
  const replySnapshot = pickReplySnapshot({ pkg: effectivePackage });
  const optionalDomainCheck = buildOptionalDomainCheck({ pkg: effectivePackage });
  const rawProposals = buildCompositionProposals({ pkg: effectivePackage }).map((proposal) =>
    regenerateProposalByFeedback({
      proposal,
      handles: effectivePackage.interpretationHandles,
      feedbackSignals: input.feedbackSignals,
    }),
  );
  const compositionProposals = rerankProposalsByFeedback({
    proposals: rawProposals,
    feedbackSignals: input.feedbackSignals,
    handles: effectivePackage.interpretationHandles,
  });
  const refinementPrompt = buildRefinementPrompt({ pkg: effectivePackage });

  return {
    replySnapshot,
    optionalDomainCheck,
    compositionProposals,
    refinementPrompt,
  };
}
