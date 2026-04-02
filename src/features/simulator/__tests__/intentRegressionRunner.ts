import { buildMultiTurnIntentSpecSummary } from "./intentStabilization.spec";

async function main() {
  const results = await buildMultiTurnIntentSpecSummary();
  const failed = results.filter((item) => !item.pass);

  for (const result of results) {
    const status = result.pass ? "PASS" : "FAIL";
    console.log(`${status} ${result.name}`);
    for (const [check, pass] of Object.entries(result.checks)) {
      console.log(`  ${pass ? "ok" : "xx"} ${check}`);
    }
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
