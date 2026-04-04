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
    return "要是不完全是这味道，你就轻轻拨我一下。";
  }

  return "这里我还想再听你一句，不然太容易替你说满了。";
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

function applyFeedbackToPackage(input: {
  pkg: FrontstageSemanticPackage;
  feedbackSignals?: ProposalFeedbackSignal[];
}) {
  const signals = input.feedbackSignals ?? [];
  if (signals.length === 0) {
    return input.pkg;
  }

  const latestCorrectedDomain = [...signals].reverse().find((signal) => signal.correctedDomain)?.correctedDomain;
  const boostedHandleIds = new Set(signals.flatMap((signal) => signal.boostedHandles ?? []));
  const reducedHandleIds = new Set(signals.flatMap((signal) => signal.reducedHandles ?? []));

  return {
    ...input.pkg,
    interpretationDomain: latestCorrectedDomain ?? input.pkg.interpretationDomain,
    domainConfidence: latestCorrectedDomain ? "medium" : input.pkg.domainConfidence,
    interpretationHandles: input.pkg.interpretationHandles.map((handle) => {
      let plannerWeight = handle.plannerWeight ?? 0.5;
      if (boostedHandleIds.has(handle.id)) plannerWeight += 0.12;
      if (reducedHandleIds.has(handle.id)) plannerWeight -= 0.12;
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

  const selectedIds = new Set(signals.flatMap((signal) => signal.selectedProposalIds ?? []));
  const blendedIds = new Set(signals.flatMap((signal) => signal.blendedProposalIds ?? []));
  const boostedIds = new Set(signals.flatMap((signal) => signal.boostedHandles ?? []));
  const reducedIds = new Set(signals.flatMap((signal) => signal.reducedHandles ?? []));
  const handleLabelById = new Map(input.handles.map((handle) => [handle.id, handle.label]));

  return [...input.proposals].sort((left, right) => {
    const scoreProposal = (proposal: CompositionProposal) => {
      let score = 0;
      if (selectedIds.has(proposal.id)) score += 20;
      if (blendedIds.has(proposal.id)) score += 16;

      for (const handleId of boostedIds) {
        const label = handleLabelById.get(handleId);
        if (label && proposal.dominantHandles.includes(label)) score += 8;
      }
      for (const handleId of reducedIds) {
        const label = handleLabelById.get(handleId);
        if (label && proposal.dominantHandles.includes(label)) score -= 8;
        if (label && proposal.suppressedHandles?.includes(label)) score += 4;
      }
      return score;
    };

    return scoreProposal(right) - scoreProposal(left);
  });
}

function buildFloralHerbalScentProposals(pkg: FrontstageSemanticPackage): CompositionProposal[] {
  const scent = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "scent" })[0]?.label ?? "草本花香轻轻浮出来";
  const color = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "colorClimate" })[0]?.label ?? "柔紫灰的香气气候";
  const modifier = topHandlesByKind({ handles: pkg.interpretationHandles, kind: "modifier" })[0]?.label ?? "香气融进空气里";

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
      summary: `${scent} 还是最前面的那层，只在局部留一点植物痕迹，让它别完全退成空气，但也别长成花田。`,
      dominantHandles: [scent],
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
      text: "你怎么看？",
      allowedActions: ["correct-domain", "choose-proposal"],
    };
  }

  if (input.pkg.domainConfidence === "medium") {
    return {
      mode: "nudge",
      text: "说说看？",
      allowedActions: ["choose-proposal", "blend-proposals", "boost-handle", "reduce-handle", "correct-domain"],
    };
  }

  return {
    mode: "blend",
    text: "你觉得呢？",
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
  const rawProposals = buildCompositionProposals({ pkg: effectivePackage });
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
