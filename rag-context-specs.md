
# TypeScript MCP + OpenCode RAG Context Strategy (Specs-Based)

## ✅ Target Architecture
Specs → Structured Context → Embeddings → SQLite RAG → Dynamic Prompt

- Load only relevant context (no full repo injection)
- Ensure deterministic and consistent behavior
- Optimize for Claude Code and GitHub Copilot

## 🧠 Context Engineering Strategy
### Structured Context (Primary Source)
- Architecture definitions
- Domain rules
- Coding conventions
- Glossary
- System prompt

### Code Context (Secondary Source)
- Functions and classes
- Inline documentation
- Tests

### Decision Context (Long-term Memory)
- ADRs (Architecture Decision Records)
- Design decisions

## ✅ Why Use /specs Instead of /docs
- /specs = authoritative, machine-readable system definition
- /docs = human-oriented documentation

Use /specs when content is:
- Normative (defines system behavior)
- Used directly in prompts
- Required for deterministic AI output

## 🗂️ Recommended Repository Layout
`"
Write-Line 

## 📦 Chunking Strategy

### Documentation
- Split by semantic sections

### Code
- One chunk per function
- One chunk per class

### ADR
- One ADR per chunk

Avoid:
- Large chunks (>1000 tokens)
- Entire files
- Mixed domains

## 🧬 Metadata Schema
`	s
type Chunk = {
  id: string
  content: string
  embedding: number[]

  type: 'architecture' | 'domain' | 'code' | 'test' | 'adr'

  path: string
  symbol?: string
  tags: string[]

  importance: number
}
`"
Write-Line "

# Retrieval
Write-Line 
### Hybrid Retrieval
- Semantic search (embeddings)
- Rule-based ranking

### Example Boosting Logic
`	s
if (chunk.path.startsWith('/specs')) score *= 1.5
if (chunk.type === 'domain') score *= 1.5
if (chunk.type === 'architecture') score *= 1.3
if (chunk.path.includes(currentFile)) score *= 1.2
`"
Write-Line "

# Prompt Composition
Write-Line 
### Order of Context Injection
1. system-prompt.md
2. architecture.md
3. domain.md
4. relevant code
5. tests

### Example
`	xt
You are working on a SaaS system.

=== Architecture ===
...

=== Domain Rules ===
...

=== Code ===
...
`"
Write-Line "

# Prioritization
Write-Line 
- Domain: highest priority
- Architecture: high priority
- Code: medium
- Tests: medium
- ADR: contextual

## 🧠 Heuristics
- Always include domain rules if available
- Prefer local file context
- Include tests where possible
- Limit to 5–10 chunks
- Keep total context under ~8K tokens

## 🏗️ MCP / Plugin Pipeline
Specs / Code → Parser → Chunker → Embeddings → SQLite → Retriever → Prompt Builder → LLM

## 🗄️ SQLite Schema
`sql
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  content TEXT,
  type TEXT,
  path TEXT,
  symbol TEXT,
  importance INTEGER
);

CREATE TABLE embeddings (
  chunk_id TEXT,
  vector BLOB
);
`"
Write-Line "

# Optimizations
Write-Line 
### Claude Code
- Use structured Markdown
- Include architecture + ADRs
- Leverage large context window

### GitHub Copilot
- Keep context short
- Use strong inline comments
- Focus on active file

## 🚀 Advanced /specs Pattern
`"
Write-Line 

## 🚀 TL;DR
- Use /specs as the primary AI context source
- Keep content structured and modular
- Implement hybrid retrieval
- Use metadata-rich chunks
- Prioritize: Domain > Architecture > Code > Tests

