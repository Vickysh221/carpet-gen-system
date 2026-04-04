import { analyzeEntryText } from "../index";
import { deriveProposalFeedbackSignal } from "../proposalFeedbackSignals";

const baseCases = [
  {
    input: "加州沙滩和柠檬叶的香气",
    feedback: "我更偏第二种，不过空气想再多留一点，叶子先别那么重。",
  },
  {
    input: "加州沙滩和柠檬叶的香气",
    feedback: "第一种和第三种我想揉一下，别太满，气还是松一点。",
  },
  {
    input: "薰衣草的芳香",
    feedback: "植物那层再退一点吧，我其实更想把花香多留一点。",
  },
  {
    input: "加州沙滩和柠檬叶的香气",
    feedback: "海边那个感觉有点偏了，我更想往草本花香这边靠。",
  },
  {
    input: "烟雨里有一点竹影",
    feedback: "烟雨那层我还想多留一点，竹影再轻一点就对了。",
  },
];

const results = await Promise.all(baseCases.map(async (testCase) => {
  const base = await analyzeEntryText({ text: testCase.input });
  const signal = deriveProposalFeedbackSignal({
    text: testCase.feedback,
    currentPlan: base.frontstageResponsePlan,
    currentPackage: base.frontstageSemanticPackage,
  });
  const next = await analyzeEntryText({
    text: `${testCase.input}\n${testCase.feedback}`,
    latestReplyText: testCase.feedback,
    proposalFeedbackSignals: signal ? [signal] : [],
  });

  return {
    input: testCase.input,
    feedback: testCase.feedback,
    parsedSignal: signal,
    nextDomain: next.frontstageSemanticPackage?.interpretationDomain ?? null,
    nextHandles: (next.frontstageSemanticPackage?.interpretationHandles ?? []).map((handle) => handle.label),
    nextAxes: (next.frontstageSemanticPackage?.compositionAxes ?? []).map((axis) => axis.label),
    nextMisleadingPaths: (next.frontstageSemanticPackage?.misleadingPaths ?? []).map((path) => path.label),
    nextReplySnapshot: next.frontstageResponsePlan?.replySnapshot ?? null,
    nextProposalTitles: (next.frontstageResponsePlan?.compositionProposals ?? []).map((proposal, index) => `${index + 1}. ${proposal.title}`),
  };
}));

console.log(JSON.stringify(results, null, 2));
