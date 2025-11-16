import { ResearchAgent } from "./agents/research/researchAgent";

async function main() {
  const agent = new ResearchAgent();

  console.log("Ingesting sample text...");
  await agent.ingestContent(
    "sample",
    "AI agents are increasingly being used for automated market research."
  );

  const output = await agent.analyze("What trends are emerging?");
  console.log("Analysis:");
  console.log(output);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
