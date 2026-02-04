# USDC Mandate skill

Intent-bound spending rules for OpenClaw + USDC. The agent checks a user-defined mandate before **any** USDC payment and refuses payments that would violate it.

## What it does

- **Cap:** e.g. max 50 USDC per week/month
- **Whitelist:** only pay specific addresses (optional)
- **Use:** restrict to certain uses like API, bounties (optional)

Mandate and ledger live in the agent workspace (e.g. `~/.openclaw/workspace/.usdc-mandate.json` and `.usdc-mandate-ledger.json`).

## Quick start

1. **Install / enable** the skill in OpenClaw (per your OpenClaw docs).
2. **Set a mandate** in natural language, e.g.  
   *"Set my mandate to 50 USDC per week, any recipient."*  
   The agent creates/updates `.usdc-mandate.json` and confirms.
3. **Payments** are gated: the agent reads the mandate and ledger before every USDC payment and refuses if the payment would exceed the cap or violate recipients/use.

**Best results:** For the agent to always check the mandate on plain "Send X USDC" requests, add to your agent instructions (e.g. AGENTS.md or system prompt): *"When the user asks to send or pay USDC, first check the USDC mandate (read .usdc-mandate.json in the workspace). If it does not exist, reply only: No mandate set. Ask me to set a mandate first (e.g. max 50 USDC per week)."*

## Files

| File | Purpose |
|------|--------|
| `SKILL.md` | Full instructions for the agent (mandate schema, ledger, checks). |
| `.usdc-mandate.json.example` | Example mandate; copy into workspace as `.usdc-mandate.json` and edit. |
| `validate-mandate.js` | Optional: `node validate-mandate.js [workspace]` to validate mandate (and ledger) JSON. |

## Test results (as of 2026-02-04)

| Test | Result |
|------|--------|
| Exact schema (`maxAmountPerPeriod`, `period`) in mandate file | ✅ Pass |
| Ledger append after approved payment | ✅ Pass |
| Whitelist: refuse when recipient not in `allowedRecipients` | ✅ Pass |
| `allowedUse`: refuse when use does not match | ✅ Pass |
| Period rollover: spent only from current period | ✅ Pass |
| No mandate: refuse with "set a mandate first" | ⚠️ Partial: works when the user message triggers the skill (e.g. "Per the USDC mandate skill, I want to send 10 USDC"); plain "Send 10 USDC" may get "I can't send crypto" before the skill is applied. |

---

## Testnet only

This skill is intended for **testnet USDC**. Do not use for mainnet or real funds unless you explicitly configure and accept the risk.

## License

See repo root.
