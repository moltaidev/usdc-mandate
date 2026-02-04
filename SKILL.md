---
name: usdc-mandate
description: Use for every user request that involves sending, paying, or transferring USDC. Check mandate first; if no mandate file, refuse with "No mandate set. Ask me to set a mandate first." Gate agent USDC payments by user-set rules (budget, cap, whitelist). Intent-bound layer so the agent only pays within your rules.
metadata: {"openclaw":{"emoji":"🔐","homepage":"https://github.com/moltaidev/usdc-mandate","always":true}}
---

# USDC Mandate (Intent-Bound)

This skill enforces **user-set spending rules** for USDC. Before **any** USDC payment (send, escrow, x402, or other), the agent **must** check the mandate and **refuse** if the payment would violate it.

**You decide:** maximum amount per period, allowed recipients, allowed use. The agent only pays when the payment fits.

---

## First step for any USDC send request

When the user asks to **send** or **pay** USDC (in any form), your **first** action is to check if `.usdc-mandate.json` exists in the workspace. If it does **not** exist, refuse with **only**: "No mandate set. Ask me to set a mandate first (e.g. max 50 USDC per week)." Do this **before** giving any other response (e.g. do not say you cannot send cryptocurrency).

---

## Mandate file location

Store the mandate in the **agent workspace root**:

- **Path:** `{workspace}/.usdc-mandate.json`
- If `{workspace}` is not set, use the default OpenClaw workspace (e.g. `~/.openclaw/workspace`).

The agent must **read** this file before any USDC payment and **update** the ledger file after a payment (see below).

---

## Mandate schema (`.usdc-mandate.json`)

**Use only these exact field names.** Do not use `max`, `unit`, `interval`, or other names; use `maxAmountPerPeriod`, `period`, `periodStart`, etc.

```json
{
  "version": 1,
  "maxAmountPerPeriod": 50,
  "period": "week",
  "periodStart": "2026-02-04",
  "allowedRecipients": ["any"],
  "allowedUse": "any",
  "note": "Optional: API calls and bounties only"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `maxAmountPerPeriod` | number | Yes | Max USDC allowed in the current period (e.g. 50 = 50 USDC). |
| `period` | string | Yes | `"day"` \| `"week"` \| `"month"`. |
| `periodStart` | string | Yes | ISO date when the current period started (e.g. `"2026-02-04"`). |
| `allowedRecipients` | array | No | `["any"]` or list of addresses (e.g. `["0x...", "0x..."]`). If omitted, treat as `["any"]`. |
| `allowedUse` | string | No | `"any"` or e.g. `"API"`, `"bounties"`, `"escrow"`. If omitted, treat as `"any"`. |
| `note` | string | No | Human-readable note for the user. |

---

## Ledger file (spent this period)

Store **payments made in the current period** so the agent can enforce the cap:

- **Path:** `{workspace}/.usdc-mandate-ledger.json`

Example:

```json
[
  { "timestamp": "2026-02-05T10:00:00Z", "amount": 10, "recipient": "0x...", "reason": "API call" },
  { "timestamp": "2026-02-06T14:00:00Z", "amount": 20, "recipient": "0x...", "reason": "Bounty" }
]
```

Before any payment, the agent must:

1. Read `.usdc-mandate.json` and `.usdc-mandate-ledger.json`.
2. Compute **spent this period**: sum of `amount` in the ledger where `timestamp` falls in the current period (using `period` and `periodStart`).
3. If `spent + paymentAmount > maxAmountPerPeriod`, **refuse** the payment and tell the user the mandate would be exceeded.
4. If `allowedRecipients` is not `["any"]` and the payment recipient is not in the list, **refuse**.
5. If `allowedUse` is not `"any"` and the payment reason/use does not match, **refuse**.
6. Only if all checks pass, proceed with the payment and **append** the new payment to the ledger file.

---

## When the user sets a mandate

If the user says things like:

- "My agent may spend at most 50 USDC this week"
- "Only pay these addresses: 0x..., 0x..."
- "Cap USDC at 100 per month for API calls"

Then:

1. Create or update `.usdc-mandate.json` in the workspace with the parsed rules.
2. Set `periodStart` to the start of the current period (e.g. start of this week or month).
3. If the user did not specify recipients or use, set `allowedRecipients: ["any"]` and `allowedUse: "any"`.
4. Confirm to the user: "Mandate set. I will only make USDC payments that fit these rules."

---

## Before every USDC payment

Before **any** USDC payment (send, escrow, x402, BME, ClawTasks, or other):

1. **Read** `.usdc-mandate.json`. If the file does not exist, **refuse** the payment and tell the user **only**: "No mandate set. Ask me to set a mandate first (e.g. max 50 USDC per week)." Do not give any other reason (e.g. do not say you cannot send cryptocurrency); the only reason is that no mandate is set.
2. **Read** `.usdc-mandate-ledger.json` (or treat as empty array if missing).
3. **Check** amount, recipient, and use against the mandate (see schema and ledger logic above).
4. If any check fails, **refuse** and explain which rule would be violated.
5. If all checks pass, **proceed** with the payment, then **append** the payment to the ledger file.

Never skip this check. This skill is the **permission layer**: the agent must not pay outside the mandate.

---

## Resetting the period

When a new period starts (e.g. a new week), the agent can:

- Option A: Update `periodStart` in `.usdc-mandate.json` to the new period start and **clear** or **archive** the ledger for the new period (e.g. keep ledger but only sum entries where `timestamp >= periodStart`).
- Option B: Keep the ledger and compute "spent this period" by filtering ledger entries where `timestamp` is within the current period (using `periodStart` and `period`). So no need to clear the file; just filter by date.

Prefer Option B: do not modify the ledger when the period rolls over; only filter by `periodStart` and `period` when summing.

---

## Example: setting a mandate

User: "Set my mandate to 50 USDC per week, any recipient."

Agent:

1. Writes `~/.openclaw/workspace/.usdc-mandate.json` (or the configured workspace):
   ```json
   {
     "version": 1,
     "maxAmountPerPeriod": 50,
     "period": "week",
     "periodStart": "2026-02-04",
     "allowedRecipients": ["any"],
     "allowedUse": "any",
     "note": "50 USDC per week, any recipient"
   }
   ```
2. Ensures `.usdc-mandate-ledger.json` exists (empty array `[]` if new).
3. Replies: "Mandate set. I will only make USDC payments that stay within 50 USDC per week. I'll check this before every payment."

---

## Example: payment refused

User: "Send 60 USDC to 0xABC..."

Agent reads mandate: max 50 USDC per week; ledger shows 10 already spent this week. So 10 + 60 = 70 > 50. Agent replies: "Refused: that would exceed your mandate (50 USDC per week; 10 already spent this week)."

---

## Testnet only

This skill is for **testnet USDC** and mandate rules. Do not use for mainnet or real funds unless the user has explicitly configured mainnet and accepted risk.
