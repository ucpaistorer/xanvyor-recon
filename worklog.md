# Worklog: ZAI SDK Memory Optimization

**Date:** 2025-03-04
**Task:** Optimize `/home/z/my-project/src/lib/zai.ts` to prevent Node.js memory crashes under heavy OSINT API load

## Problem

The XANVYOR RECON server crashed after processing a few heavy OSINT requests. Each API route called `safeWebSearch`, `safeAIAnalysis`, `safeVisionAnalysis`, or `safeChatCompletion`, and each of those functions did:

1. `(await import('z-ai-web-dev-sdk')).default` — dynamic import every call
2. `ZAI.create()` — created a brand-new ZAI instance every call

With 30+ OSINT routes, each doing multiple web searches + AI analysis, a single heavy request could create 5-10+ ZAI instances. Under concurrent load, this caused memory exhaustion and crashes.

## Changes Made

### 1. Singleton ZAI Instance (`getZAIInstance()`)

- **Before:** Every call to `safeWebSearch`, `safeAIAnalysis`, etc. called `ZAI.create()` to make a new instance.
- **After:** A single `getZAIInstance()` function manages a module-level singleton:
  - Caches the dynamic import of `z-ai-web-dev-sdk` (`zaiModule`)
  - Caches the created instance with a timestamp (`cachedZAI`)
  - **TTL-based auto-refresh:** Instance is automatically recreated after 5 minutes (`ZAI_INSTANCE_TTL_MS`) to release accumulated memory
  - **Deduplication:** If multiple calls arrive while an instance is being created, they share the same init promise (`zaiInitPromise`) — no duplicate `create()` calls
  - **Invalidation:** `invalidateZAIInstance()` forces a fresh start when the instance appears broken (timeout, connection reset, socket errors)

### 2. Request Timeout Wrapper (`withTimeout()`)

- **Before:** ZAI SDK calls had no timeout — a hung request would accumulate memory indefinitely.
- **After:** Every ZAI SDK call is wrapped with `withTimeout(promise, 30_000, label)` that races the operation against a 30-second timer. Hung requests are rejected cleanly.

### 3. Concurrency Limiter (Simple Semaphore)

- **Before:** No limit on concurrent ZAI SDK operations. Under load, all requests hit the SDK simultaneously.
- **After:** `acquireSlot()` / `releaseSlot()` implements a counting semaphore allowing at most `MAX_CONCURRENT_ZAI_CALLS = 4` simultaneous SDK operations. Excess requests queue and are served in FIFO order. This prevents memory spikes from too many parallel SDK connections.

### 4. Memory-Efficient Result Handling

- **Search result cap:** `MAX_SEARCH_RESULTS = 20` — even if a caller requests more, results are capped to prevent large arrays from bloating memory.
- **AI response truncation:** `MAX_ANALYSIS_CHARS = 50_000` — AI responses are truncated if absurdly long, with a `[...truncated for memory safety]` marker.
- **Defensive slicing:** `safeWebSearch` slices results even if the SDK returns more than requested.

### 5. Instance Health Tracking & Auto-Recovery

- When a ZAI call fails with timeout, ECONNRESET, or socket errors, `invalidateZAIInstance()` is called to force a fresh instance on the next attempt.
- The init promise lock is always cleared in a `finally` block so future calls can retry even after errors.

### 6. Function Signatures Unchanged

All public function signatures remain identical:
- `publicWebSearch(query, num, retries)` ✓
- `publicIpGeo(ip)` ✓
- `safeWebSearch(query, num, retries)` ✓
- `safeAIAnalysis(systemPrompt, userPrompt, retries)` ✓
- `sequentialWebSearch(calls, delayMs)` ✓
- `safeVisionAnalysis(imageUrl, prompt, retries)` ✓
- `safeChatCompletion(messages, options)` ✓
- `getZAI()` ✓

All fallback mechanisms (DuckDuckGo search, template analysis) are preserved.

## Configuration Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `ZAI_REQUEST_TIMEOUT_MS` | 30,000 | Max time per SDK call |
| `ZAI_INSTANCE_TTL_MS` | 300,000 (5 min) | Auto-refresh singleton |
| `MAX_CONCURRENT_ZAI_CALLS` | 4 | Parallel SDK operation limit |
| `MAX_SEARCH_RESULTS` | 20 | Cap search result array size |
| `MAX_ANALYSIS_CHARS` | 50,000 | Cap AI response string size |

## Lint Status

No new lint errors introduced. Pre-existing errors in `scripts/` directory are unrelated.
