$outputFile = "rag-context-specs.md"

# Initialize file
"" | Out-File $outputFile

function Write-Line($text) {
    Add-Content -Path $outputFile -Value $text
}

# Title
Write-Line "# TypeScript MCP + OpenCode RAG Context Strategy (Specs-Based)"
Write-Line ""

# Target Architecture
Write-Line "## ✅ Target Architecture"
Write-Line "Specs → Structured Context → Embeddings → SQLite RAG → Dynamic Prompt"
Write-Line ""
Write-Line "- Load only relevant context (no full repo injection)"
Write-Line "- Ensure deterministic and consistent behavior"
Write-Line "- Optimize for Claude Code and GitHub Copilot"
Write-Line ""

# Context Engineering
Write-Line "## 🧠 Context Engineering Strategy"

Write-Line "### Structured Context (Primary Source)"
Write-Line "- Architecture definitions"
Write-Line "- Domain rules"
Write-Line "- Coding conventions"
Write-Line "- Glossary"
Write-Line "- System prompt"
Write-Line ""

Write-Line "### Code Context (Secondary Source)"
Write-Line "- Functions and classes"
Write-Line "- Inline documentation"
Write-Line "- Tests"
Write-Line ""

Write-Line "### Decision Context (Long-term Memory)"
Write-Line "- ADRs (Architecture Decision Records)"
Write-Line "- Design decisions"
Write-Line ""

# Specs vs Docs
Write-Line "## ✅ Why Use /specs Instead of /docs"
Write-Line "- /specs = authoritative, machine-readable system definition"
Write-Line "- /docs = human-oriented documentation"
Write-Line ""
Write-Line "Use /specs when content is:"
Write-Line "- Normative (defines system behavior)"
Write-Line "- Used directly in prompts"
Write-Line "- Required for deterministic AI output"
Write-Line ""

# Repo Layout
Write-Line "## 🗂️ Recommended Repository Layout"
Write-Line "```"
Write-Line "/specs"
Write-Line "  architecture.md"
Write-Line "  domain.md"
Write-Line "  conventions.md"
Write-Line "  glossary.md"
Write-Line "  system-prompt.md"
Write-Line ""
Write-Line "/specs/adr"
Write-Line "  adr-001-auth.md"
Write-Line "  adr-002-db.md"
Write-Line ""
Write-Line "/src"
Write-Line "  **/*.ts"
Write-Line ""
Write-Line "/tests"
Write-Line "  **/*.test.ts"
Write-Line ""
Write-Line "/docs"
Write-Line "  onboarding.md"
Write-Line "  setup.md"
Write-Line "```"
Write-Line ""

# Chunking
Write-Line "## 📦 Chunking Strategy"
Write-Line ""
Write-Line "### Documentation"
Write-Line "- Split by semantic sections"
Write-Line ""
Write-Line "### Code"
Write-Line "- One chunk per function"
Write-Line "- One chunk per class"
Write-Line ""
Write-Line "### ADR"
Write-Line "- One ADR per chunk"
Write-Line ""
Write-Line "Avoid:"
Write-Line "- Large chunks (>1000 tokens)"
Write-Line "- Entire files"
Write-Line "- Mixed domains"
Write-Line ""

# Metadata
Write-Line "## 🧬 Metadata Schema"
Write-Line "```ts"
Write-Line "type Chunk = {"
Write-Line "  id: string"
Write-Line "  content: string"
Write-Line "  embedding: number[]"
Write-Line ""
Write-Line "  type: 'architecture' | 'domain' | 'code' | 'test' | 'adr'"
Write-Line ""
Write-Line "  path: string"
Write-Line "  symbol?: string"
Write-Line "  tags: string[]"
Write-Line ""
Write-Line "  importance: number"
Write-Line "}"
Write-Line "```"
Write-Line ""

# Retrieval
Write-Line "## 🔍 Retrieval Strategy"

Write-Line "### Hybrid Retrieval"
Write-Line "- Semantic search (embeddings)"
Write-Line "- Rule-based ranking"
Write-Line ""

Write-Line "### Example Boosting Logic"
Write-Line "```ts"
Write-Line "if (chunk.path.startsWith('/specs')) score *= 1.5"
Write-Line "if (chunk.type === 'domain') score *= 1.5"
Write-Line "if (chunk.type === 'architecture') score *= 1.3"
Write-Line "if (chunk.path.includes(currentFile)) score *= 1.2"
Write-Line "```"
Write-Line ""

# Prompt Composition
Write-Line "## ⚙️ Prompt Composition"

Write-Line "### Order of Context Injection"
Write-Line "1. system-prompt.md"
Write-Line "2. architecture.md"
Write-Line "3. domain.md"
Write-Line "4. relevant code"
Write-Line "5. tests"
Write-Line ""

Write-Line "### Example"
Write-Line "```txt"
Write-Line "You are working on a SaaS system."
Write-Line ""
Write-Line "=== Architecture ==="
Write-Line "..."
Write-Line ""
Write-Line "=== Domain Rules ==="
Write-Line "..."
Write-Line ""
Write-Line "=== Code ==="
Write-Line "..."
Write-Line "```"
Write-Line ""

# Prioritization
Write-Line "## 💡 Context Prioritization"
Write-Line "- Domain: highest priority"
Write-Line "- Architecture: high priority"
Write-Line "- Code: medium"
Write-Line "- Tests: medium"
Write-Line "- ADR: contextual"
Write-Line ""

# Heuristics
Write-Line "## 🧠 Heuristics"

Write-Line "- Always include domain rules if available"
Write-Line "- Prefer local file context"
Write-Line "- Include tests where possible"
Write-Line "- Limit to 5–10 chunks"
Write-Line "- Keep total context under ~8K tokens"
Write-Line ""

# Pipeline
Write-Line "## 🏗️ MCP / Plugin Pipeline"
Write-Line "Specs / Code → Parser → Chunker → Embeddings → SQLite → Retriever → Prompt Builder → LLM"
Write-Line ""

# SQLite
Write-Line "## 🗄️ SQLite Schema"
Write-Line "```sql"
Write-Line "CREATE TABLE chunks ("
Write-Line "  id TEXT PRIMARY KEY,"
Write-Line "  content TEXT,"
Write-Line "  type TEXT,"
Write-Line "  path TEXT,"
Write-Line "  symbol TEXT,"
Write-Line "  importance INTEGER"
Write-Line ");"
Write-Line ""
Write-Line "CREATE TABLE embeddings ("
Write-Line "  chunk_id TEXT,"
Write-Line "  vector BLOB"
Write-Line ");"
Write-Line "```"
Write-Line ""

# Optimizations
Write-Line "## 🧩 Model-Specific Optimizations"

Write-Line "### Claude Code"
Write-Line "- Use structured Markdown"
Write-Line "- Include architecture + ADRs"
Write-Line "- Leverage large context window"
Write-Line ""

Write-Line "### GitHub Copilot"
Write-Line "- Keep context short"
Write-Line "- Use strong inline comments"
Write-Line "- Focus on active file"
Write-Line ""

# Advanced Specs Strategy
Write-Line "## 🚀 Advanced /specs Pattern"
Write-Line "```"
Write-Line "/specs"
Write-Line "  /core"
Write-Line "    architecture.md"
Write-Line "    domain.md"
Write-Line ""
Write-Line "  /rules"
Write-Line "    conventions.md"
Write-Line "    constraints.md"
Write-Line ""
Write-Line "  /context"
Write-Line "    glossary.md"
Write-Line "    system-prompt.md"
Write-Line "```"
Write-Line ""

# Final TLDR
Write-Line "## 🚀 TL;DR"
Write-Line "- Use /specs as the primary AI context source"
Write-Line "- Keep content structured and modular"
Write-Line "- Implement hybrid retrieval"
Write-Line "- Use metadata-rich chunks"
Write-Line "- Prioritize: Domain > Architecture > Code > Tests"
Write-Line ""

Write-Host "Specs-based RAG summary generated in $outputFile"