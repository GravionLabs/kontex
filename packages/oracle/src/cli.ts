import { recommendModel } from './services/issue-scorer.js';
import { getProvider } from './services/model-registry.js';
import type { Provider } from './types.js';

const USAGE = `oracle recommend-model [options]

Options:
  --title <text>         Issue title
  --body <text>          Issue body
  --labels <list>        Comma-separated labels
  --provider <name>      anthropic | openai | google | opencode
  --json                 Output as JSON
  --help                 Show help`;

interface ParsedArgs {
  command: string;
  title?: string;
  body?: string;
  labels?: string[];
  provider?: Provider;
  json: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    command: '',
    title: undefined,
    body: undefined,
    labels: undefined,
    provider: undefined,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') {
      args.help = true;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--title' && i + 1 < argv.length) {
      args.title = argv[++i];
    } else if (arg === '--body' && i + 1 < argv.length) {
      args.body = argv[++i];
    } else if (arg === '--labels' && i + 1 < argv.length) {
      args.labels = argv[++i].split(',').map((s) => s.trim());
    } else if (arg === '--provider' && i + 1 < argv.length) {
      args.provider = argv[++i] as Provider;
    } else if (!arg.startsWith('--') && !args.command) {
      args.command = arg;
    }
  }

  return args;
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.command !== 'recommend-model') {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  if (!args.title || !args.body) {
    process.stderr.write('Error: --title and --body are required\n\n');
    process.stderr.write(`${USAGE}\n`);
    process.exit(1);
  }

  if (args.provider) {
    process.env.ORACLE_PREFERRED_PROVIDER = args.provider;
  }

  const result = await recommendModel({
    title: args.title,
    body: args.body,
    labels: args.labels,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`Model: ${result.model}\n`);
    process.stdout.write(`Tier: ${result.tier}\n`);
    process.stdout.write(`Score: ${result.complexityScore}\n`);
    process.stdout.write(`Context: ${result.contextSize}\n`);
    process.stdout.write(`Reasoning: ${result.reasoning}\n`);
    process.stdout.write(`Override: ${result.overriddenBy}\n`);
  }
}
