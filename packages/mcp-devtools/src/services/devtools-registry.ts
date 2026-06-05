export interface DevToolsConfig {
  timeoutMs: number;
  maxOutputLines: number;
  allowedCommands: Set<string>;
  workingDir?: string;
}

export class DevToolsRegistry {
  private readonly config: DevToolsConfig;

  constructor(rootDir = process.cwd()) {
    this.config = {
      timeoutMs: parseInt(process.env.DEVTOOLS_TIMEOUT_MS ?? '30000', 10),
      maxOutputLines: parseInt(process.env.DEVTOOLS_MAX_OUTPUT_LINES ?? '1000', 10),
      allowedCommands: new Set(
        (process.env.DEVTOOLS_ALLOWED_COMMANDS ?? 'pytest,cargo,dotnet,npm,pnpm').split(',').map((c) => c.trim()),
      ),
      workingDir: process.env.DEVTOOLS_WORKING_DIR ?? rootDir,
    };
  }

  getConfig(): Readonly<DevToolsConfig> {
    return this.config;
  }

  isCommandAllowed(command: string): boolean {
    const base = command.split(/\s+/)[0];
    return this.config.allowedCommands.has(base);
  }
}
