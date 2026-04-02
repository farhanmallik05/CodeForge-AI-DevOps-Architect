import { query } from "gitclaw";

// ── Model Selection ──────────────────────────────────────────────────────────
// Set ONE of the following environment variables before running:
//
//   Anthropic (Claude):  $env:ANTHROPIC_API_KEY="sk-ant-..."
//   OpenAI (GPT-4):      $env:OPENAI_API_KEY="sk-..."
//   Google (Gemini):     $env:GEMINI_API_KEY="AIza..."
//
// The script will auto-detect which key is set and pick the right model.
// ─────────────────────────────────────────────────────────────────────────────

function resolveModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("🔑 Using Anthropic Claude (claude-sonnet-4-5-20250929)");
    return "anthropic:claude-sonnet-4-5-20250929";
  }
  if (process.env.OPENAI_API_KEY) {
    console.log("🔑 Using OpenAI GPT-4o");
    return "openai:gpt-4o";
  }
  if (process.env.GEMINI_API_KEY) {
    console.log("🔑 Using Google Gemini (gemini-2.5-pro)");
    return "google:gemini-2.5-pro";
  }

  console.error(
    "❌ No API key found! Please set one of:\n" +
    "   ANTHROPIC_API_KEY  — for Claude (recommended)\n" +
    "   OPENAI_API_KEY     — for GPT-4o\n" +
    "   GEMINI_API_KEY     — for Gemini 2.5 Pro\n"
  );
  process.exit(1);
}

async function run() {
  const model = resolveModel();

  console.log("🔨 Starting CodeForge AI DevOps Architect...\n");

  const agentStream = query({
    prompt:
      "Analyze the demo/sample-project directory and generate complete deployment infrastructure. " +
      "Include: Dockerfile, .dockerignore, GitHub Actions CI/CD pipeline, Kubernetes manifests (Deployment, Service, Ingress, HPA, PDB, NetworkPolicy), " +
      "and a Prometheus ServiceMonitor. Follow all rules in RULES.md strictly. " +
      "Do not ask for confirmation — output everything now.",
    dir: "./",
    model,
  });

  for await (const msg of agentStream) {
    if (msg.type === "delta") {
      process.stdout.write(msg.content);
    }
  }

  console.log("\n\n✅ CodeForge deployment pipeline complete.");
}

run().catch(console.error);
