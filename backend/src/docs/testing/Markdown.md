## Groq – Free Usage & API Limits (2026‑09)

Below is a snapshot of the most recent information available from Groq’s public documentation and community chatter.  The numbers can change, so always double‑check the **official Groq docs** or the **Dashboard** before you start a project.

| Item | Detail |
|------|--------|
| **Free credit / trial** | • **$200 USD in free credits** for new accounts (as of September 2026).  <br>• Credits are **auto‑refilled** when you upgrade to a paid plan.  <br>• Credits can be used on any paid model, but not on the “free”‑only models that have no cost per request. |
| **Free‑tier usage cap** | • **Up to 500 k tokens/month** on the free tier (any model, any size).  <br>• Once you hit the cap, you either pay for the extra tokens or switch to a paid plan. |
| **Model‑specific limits** | • **`grok-1` / `grok-3`** – max request payload 16 k tokens.  <br>• **`llama-3.1-70b`** – 32 k token context window (max 32 k tokens per request).  <br>• **`mixtral-8x7b`** – 32 k token context window. |
| **Concurrency / rate limits** | • **10 concurrent connections** per API key (default).  <br>• **~3 k requests/minute** per key (soft limit, can be raised by contacting support). |
| **Request‑size limits** | • **Payload (input + output)** must not exceed **32 k tokens** for the largest models.  <br>• **Maximum output length per request**: 4 k tokens (default) – can be increased up to 8 k with the `max_tokens` parameter. |
| **Streaming** | • Streaming responses are **not supported** on the standard API – you must wait for the whole response. |
| **Cost per token (after free tier)** | • `grok-1`: **$0.0004 / 1k tokens** (≈$0.0004 USD per 1,000 tokens).  <br>• `grok-3`: **$0.0012 / 1k tokens**.  <br>• `llama-3.1-70b`: **$0.0016 / 1k tokens**.  <br>• `mixtral-8x7b`: **$0.0012 / 1k tokens**. |
| **Other API quirks** | • No “temperature” or “top_p” tuning on the free tier – these parameters are locked to defaults.  <br>• Batch requests (e.g., `/v1/chat/completions?batch=…`) are **only available on paid plans**.  <br>• API keys are **not reusable across accounts** – you can’t share a key between projects. |

> **Quick sanity check**  
> If you’re only running a small “demo” with 10 requests × 200 tokens each, you’ll use ~2 k tokens – well below the free tier.  
> For a production workload of 50 k tokens/month, you’re already hitting the free‑tier cap, and you’ll need to switch to a paid plan or pay for extra tokens.

---

### How to Check Your Own Quotas

| Step | Action |
|------|--------|
| 1 | Sign into the Groq **Dashboard** (https://console.groq.com). |
| 2 | Navigate to **Billing → Usage**. |
| 3 | You’ll see the current credit balance, tokens used this month, and any throttling alerts. |
| 4 | The “Plan” tab shows whether you’re on a free or paid tier. |

---

## Practical Tips

| Scenario | Recommendation |
|----------|----------------|
| **Experimenting / prototyping** | Stick with the free tier.  Keep the context window ≤ 4 k tokens to stay comfortably within the rate limits. |
| **Deploying a web service** | If you need higher throughput, consider upgrading to the **Pro plan** (≈$30 USD/month) which removes the 10‑concurrency limit and gives you 3 k requests/min. |
| **Batch inference** | Use the `batch` endpoint (paid only).  This lets you queue up hundreds of prompts and get all responses in one network round‑trip. |
| **Large context** | For models that support up to 32 k tokens, split your prompt into chunks or use the **“retrieval‑augmented generation”** pattern to keep each request well below the limit. |
| **Cost‑control** | Set up a **usage alert** in the dashboard.  Groq can email you when you’re approaching a threshold. |

---

### Bottom Line

- **Free Tier**: $200 credit, ~500 k tokens/month, 10 concurrent connections, 3 k RPS.  
- **Limitations**: Max 32 k tokens per request, no streaming, limited parameter tuning, strict rate limits.  
- **Upgrade**: Switch to a paid plan if you need higher concurrency, more tokens, or advanced features (batching, higher context windows, etc.).  

**Always keep an eye on your dashboard** – that’s the most reliable source for current limits and costs. If you hit a hard limit, the API will return a `429 Too Many Requests` or `403 Forbidden` with a clear message.  Contact Groq support to lift limits or discuss custom plans.