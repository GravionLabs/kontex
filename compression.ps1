$outputFile = "rag-compression-rules.md"

# Initialize file
"" | Out-File $outputFile

function Write-Line($text) {
    Add-Content -Path $outputFile -Value $text
}

# Title
Write-Line "# RAG Compression Strategy (Selective Use)"
Write-Line ""

# Intro
Write-Line "## ✅ Key Principle"
Write-Line "Compression is useful, but must be applied selectively."
Write-Line "Goal: maximize signal-to-noise ratio, not just reduce tokens."
Write-Line ""

# Where it works
Write-Line "## ✅ Where Compression Makes Sense"

Write-Line "### After Retrieval (Primary Use Case)"
Write-Line "- Apply compression after selecting relevant chunks"
Write-Line "- Reduces token usage"
Write-Line "- Removes redundancy"
Write-Line ""
Write-Line "Pipeline:"
Write-Line "Retrieve → Rank → Compress → Prompt"
Write-Line ""

Write-Line "### Low-Priority / Historical Context"
Write-Line "- ADR history"
Write-Line "- Long documentation"
Write-Line "- Logs and traces"
Write-Line ""

Write-Line "### Repeated Context"
Write-Line "- Merge duplicated concepts"
Write-Line "- Create canonical representation"
Write-Line ""

# Where it does not work
Write-Line "## ❌ Where Compression Should NOT Be Used"

Write-Line "### Domain Rules"
Write-Line "- Must preserve exact wording"
Write-Line "- Compression may distort constraints"
Write-Line "- Always inject verbatim"
Write-Line ""

Write-Line "### Precise Code Definitions"
Write-Line "- Function signatures must be exact"
Write-Line "- Type definitions must be complete"
Write-Line "- Do not paraphrase code"
Write-Line ""

Write-Line "### System Prompt"
Write-Line "- Must stay structured and precise"
Write-Line "- Do not compress"
Write-Line ""

Write-Line "### Short, Precise Chunks"
Write-Line "- Compression on small chunks adds no value"
Write-Line "- Risk of losing critical detail outweighs token savings"
Write-Line ""

# Compression Techniques
Write-Line "## 🛠️ Compression Techniques"

Write-Line "### Extractive"
Write-Line "- Select most relevant sentences"
Write-Line "- Preserve original wording"
Write-Line "- Low distortion risk"
Write-Line ""

Write-Line "### Abstractive"
Write-Line "- Summarize into new text"
Write-Line "- Higher token savings"
Write-Line "- Higher distortion risk — avoid for specs/domain"
Write-Line ""

Write-Line "### Deduplication"
Write-Line "- Merge repeated concepts across chunks"
Write-Line "- Create single canonical representation"
Write-Line "- Safe to apply broadly"
Write-Line ""

# Compression Ratio Guidelines
Write-Line "## 📊 Compression Ratio Guidelines"
Write-Line '```'
Write-Line "Type              Compress?   Method"
Write-Line "domain rules      NO          inject verbatim"
Write-Line "architecture      SOMETIMES   extractive only"
Write-Line "ADR history       YES         abstractive OK"
Write-Line "code - active     NO          inject verbatim"
Write-Line "code - context    SOMETIMES   extractive only"
Write-Line "tests             SOMETIMES   extractive only"
Write-Line "logs/traces       YES         abstractive OK"
Write-Line "long docs         YES         abstractive OK"
Write-Line '```'
Write-Line ""

# Pipeline
Write-Line "## 🏗️ Recommended Pipeline"
Write-Line "Retrieve → Rank → Deduplicate → Selective Compress → Prompt"
Write-Line ""
Write-Line "Steps:"
Write-Line "1. Retrieve top-N chunks (semantic + rule-based)"
Write-Line "2. Rank by importance score"
Write-Line "3. Deduplicate overlapping content"
Write-Line "4. Compress only low-priority / historical chunks"
Write-Line "5. Inject high-priority chunks verbatim"
Write-Line ""

# Implementation
Write-Line "## ⚙️ Implementation Pattern"

Write-Line "### Step 1: Retrieve"
Write-Line "const chunks = retrieveTopK(userQuery)"
Write-Line ""

Write-Line "### Step 2: Classify"
Write-Line "if (chunk.type === 'domain') keepRaw(chunk)"
Write-Line "else compress(chunk)"
Write-Line ""

Write-Line "### Step 3: Compress"
Write-Line "- Remove filler text"
Write-Line "- Merge repeated content"
Write-Line "- Preserve semantics"
Write-Line ""

# Example
Write-Line "## 💡 Compression Example"
Write-Line ""
Write-Line "Before:"
Write-Line "The API layer is responsible for handling incoming requests."
Write-Line "The API layer validates all input before processing."
Write-Line "The API layer ensures authentication is checked."
Write-Line ""
Write-Line "After:"
Write-Line "API layer: handles requests, validates input, enforces authentication."
Write-Line ""

# Storage
Write-Line "## 🧬 Storage Strategy"
Write-Line "Store both raw and compressed versions:"
Write-Line ""
Write-Line "type Chunk = {"
Write-Line "  content: string"
Write-Line "  compressed?: string"
Write-Line "}"
Write-Line ""
Write-Line "Usage:"
Write-Line "const text = useCompressed ? chunk.compressed : chunk.content"
Write-Line ""

# Token Budget
Write-Line "## 💰 Token Budget Strategy"
Write-Line "- Reserve ~2K tokens for system prompt"
Write-Line "- Reserve ~1K tokens for query + instructions"
Write-Line "- Remaining budget for retrieved context"
Write-Line "- Apply compression only when budget exceeded"
Write-Line ""

# Adaptive compression
Write-Line "## 🚀 Adaptive Compression"
Write-Line "Define levels:"
Write-Line "NONE — domain rules, active code"
Write-Line "LIGHT — architecture, conventions"
Write-Line "AGGRESSIVE — ADR history, logs, long docs"
Write-Line ""

# Core Insight
Write-Line "## 🔥 Core Insight"
Write-Line "Compression is not just token reduction."
Write-Line "It is signal-to-noise optimization."
Write-Line ""

# TL;DR
Write-Line "## 🚀 TL;DR"
Write-Line "- Compress after retrieval, not before"
Write-Line "- Never compress domain rules or active code"
Write-Line "- Prefer extractive over abstractive for specs"
Write-Line "- Deduplicate broadly, compress selectively"
Write-Line "- Store both raw and compressed versions"
Write-Line "- Goal: maximum signal, minimum tokens"
Write-Line ""

Write-Host "RAG compression strategy generated in $outputFile"
