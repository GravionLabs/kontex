export interface ReasoningStripResult {
  stripped: string;
  removedChars: number;
  blockCount: number;
}

const THINKING_PATTERNS = [
  /<thinking>[\s\S]*?<\/thinking>/g,
  /<antThinking>[\s\S]*?<\/antThinking>/g,
  /<reasoning>[\s\S]*?<\/reasoning>/g,
  /<scratchpad>[\s\S]*?<\/scratchpad>/g,
];

const THINKING_LINE_PATTERNS = [/^\[thinking\].*$/gm, /^\[reasoning\].*$/gm, /^\/\/ thinking:.*$/gm];

export function stripReasoningBlocks(content: string): ReasoningStripResult {
  if (!content) {
    return { stripped: '', removedChars: 0, blockCount: 0 };
  }

  let result = content;
  let totalRemoved = 0;
  let totalBlocks = 0;

  for (const pattern of THINKING_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match = regex.exec(result);
    while (match !== null) {
      totalRemoved += match[0].length;
      totalBlocks++;
      match = regex.exec(result);
    }
    result = result.replace(pattern, '');
  }

  for (const pattern of THINKING_LINE_PATTERNS) {
    let match = pattern.exec(result);
    while (match !== null) {
      totalRemoved += match[0].length;
      totalBlocks++;
      match = pattern.exec(result);
    }
    result = result.replace(pattern, '');
  }

  result = result
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();

  return { stripped: result, removedChars: totalRemoved, blockCount: totalBlocks };
}
