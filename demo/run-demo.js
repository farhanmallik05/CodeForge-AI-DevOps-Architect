import { query } from "gitclaw";

async function run() {
  console.log("Starting CodeForge demo...");
  const agentStream = query({
    prompt: "Analyze the sample-project directory and generate complete deployment infrastructure. Do not ask for confirmation, just output everything.",
    dir: "./",
    model: "anthropic:claude-sonnet-4-5-20250929",
  });

  for await (const msg of agentStream) {
    if (msg.type === "delta") {
      process.stdout.write(msg.content);
    }
  }
  console.log("\n\n✅ CodeForge deployment pipeline complete.");
}

run().catch(console.error);
