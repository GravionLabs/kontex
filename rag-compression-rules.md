
# RAG Compression Strategy (Selective Use)

## ✅ Key Principle
Compression is useful, but must be applied selectively.
Goal: maximize signal-to-noise ratio, not just reduce tokens.

## ✅ Where Compression Makes Sense
### After Retrieval (Primary Use Case)
- Apply compression after selecting relevant chunks
- Reduces token usage
- Removes redundancy

Pipeline:
Retrieve → Rank → Compress → Prompt

### Low-Priority / Historical Context
- ADR history
- Long documentation
- Logs and traces

### Repeated Context
- Merge duplicated concepts
- Create canonical representation

## ❌ Where Compression Should NOT Be Used
### Domain Rules
- Must preserve exact wording
- Compression may distort constraints
- Always inject verbatim

### Precise Code Definitions
- Function signatures must be exact
- Type definitions must be complete
- Do not paraphrase code

### System Prompt
- Must stay structured and precise
- Do not compress

### Short, Precise Chunks
- Compression on small chunks adds no value
- Risk of losing critical detail outweighs token savings

## 🛠️ Compression Techniques
### Extractive
- Select most relevant sentences
- Preserve original wording
- Low distortion risk

### Abstractive
- Summarize into new text
- Higher token savings
- Higher distortion risk — avoid for specs/domain

### Deduplication
- Merge repeated concepts across chunks
- Create single canonical representation
- Safe to apply broadly

## 📊 Compression Ratio Guidelines
```
Type              Compress?   Method
domain rules      NO          inject verbatim
architecture      SOMETIMES   extractive only
ADR history       YES         abstractive OK
code - active     NO          inject verbatim
code - context    SOMETIMES   extractive only
tests             SOMETIMES   extractive only
logs/traces       YES         abstractive OK
long docs         YES         abstractive OK
```

## 🏗️ Recommended Pipeline
Retrieve → Rank → Deduplicate → Selective Compress → Prompt

Steps:
1. Retrieve top-N chunks (semantic + rule-based)
2. Rank by importance score
3. Deduplicate overlapping content
4. Compress only low-priority / historical chunks
5. Inject high-priority chunks verbatim

## ⚙️ Implementation Pattern
### Step 1: Retrieve
const chunks = retrieveTopK(userQuery)

### Step 2: Classify
if (chunk.type === 'domain') keepRaw(chunk)
else compress(chunk)

### Step 3: Compress
- Remove filler text
- Merge repeated content
- Preserve semantics

## 💡 Compression Example

Before:
The API layer is responsible for handling incoming requests.
The API layer validates all input before processing.
The API layer ensures authentication is checked.

After:
API layer: handles requests, validates input, enforces authentication.

## 🧬 Storage Strategy
Store both raw and compressed versions:

type Chunk = {
  content: string
  compressed?: string
}

Usage:
const text = useCompressed ? chunk.compressed : chunk.content

## 💰 Token Budget Strategy
- Reserve ~2K tokens for system prompt
- Reserve ~1K tokens for query + instructions
- Remaining budget for retrieved context
- Apply compression only when budget exceeded

## 🚀 Adaptive Compression
Define levels:
NONE — domain rules, active code
LIGHT — architecture, conventions
AGGRESSIVE — ADR history, logs, long docs

## 🔥 Core Insight
Compression is not just token reduction.
It is signal-to-noise optimization.

## 🚀 TL;DR
- Compress after retrieval, not before
- Never compress domain rules or active code
- Prefer extractive over abstractive for specs
- Deduplicate broadly, compress selectively
- Store both raw and compressed versions
- Goal: maximum signal, minimum tokens

