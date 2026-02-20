# Roundtable Factory

> **Location**: `/cofounder/tools/Marketing System/Playbooks/Roundtable Factory/`
> **Part of**: The Cofounder toolstack
> **Voice reference**: `/memory/voice.md` — read this BEFORE generating any client-facing language

## What This Tool Does

The Roundtable Factory builds complete, ready-to-execute Executive Roundtable (ERT) programs. It consolidates strategy, outreach, scripting, sales, and operations into **5 cohesive deliverables**.

The output is NOT a template. It is a fully customized program specific to the user's business, voice, and market.

---

## First Steps: Every Run

### 1. Load the Voice
Load `/memory/voice.md`. The voice file governs tone, style, and personality across all outputs.

### 2. Ask Where to Save
At the start of every build, ask:
> "Where should I save this roundtable program? Give me the folder path."

### 3. Generate the Program's Own AGENTS.md
Every completed ERT program includes its own `AGENTS.md` at the root of the output folder.

---

## Build Phases

The Factory runs through 5 engines sequentially. Read the relevant prompt file BEFORE generating output for that phase.

| # | Engine | File | What It Produces |
|---|---|---|---|
| 01 | Strategy Engine | `prompts/01_strategy_engine.md` | `01_Strategy_Brief.md`: The "Bible" (Topic, ICP, Story, Shift, Method). |
| 02 | Outreach Engine | `prompts/02_outreach_engine.md` | `02_Outreach_System.md`: Emails, DMs, sequences. |
| 03 | Script Engine | `prompts/03_script_engine.md` | `03_Roundtable_Master_Script.md`: The single executable file for the live event. |
| 04 | Sales Engine | `prompts/04_sales_engine.md` | `04_Sales_Conversion.md`: 1:1 Script & Proposal. |
| 05 | Ops Engine | `prompts/05_ops_engine.md` | `05_Operations_Manual.md`: Checklists & Scorecards. |

---

## Execution Flow

```
USER INPUT (business description, content, target market, offer)
     │
     ▼
[01 Strategy Engine] ───> produces 01_Strategy_Brief.md (Reference for all others)
     │
     ├────────────────────────┬──────────────────────┐
     ▼                        ▼                      ▼
[02 Outreach Engine]    [03 Script Engine]     [04 Sales Engine]
     │                        │                      │
     ▼                        ▼                      ▼
02_Outreach_System.md   03_Master_Script.md    04_Sales_Conversion.md
     │
     ▼
[05 Ops Engine] ────────> 05_Operations_Manual.md
```

---

## Generated Output Structure

When the Factory completes a build, it writes these 6 files to the output folder:

```
[output-folder]/
  AGENTS.md                      ← Program identity
  01_Strategy_Brief.md           ← Core Strategy & Messaging
  02_Outreach_System.md          ← All Communication
  03_Roundtable_Master_Script.md ← The Live Event Script
  04_Sales_Conversion.md         ← Closing Assets
  05_Operations_Manual.md        ← Logistics
```

### The Generated AGENTS.md Template

Every output folder gets this file:

```markdown
# [Program Name] — Executive Roundtable Program

> **Built by**: Roundtable Factory
> **Date built**: [date]
> **Voice**: `/memory/voice.md`

## How to Use

1. **Study**: Read `01_Strategy_Brief.md` to internalize the core argument.
2. **Fill**: Use `02_Outreach_System.md` to get people registered.
3. **Run**: Use `03_Roundtable_Master_Script.md` to deliver the event.
4. **Close**: Use `04_Sales_Conversion.md` to sign clients.
5. **Manage**: Use `05_Operations_Manual.md` for setup and review.

## Files
- `01_Strategy_Brief.md`: Topic, ICP, Story, Shift, Method, Offer.
- `02_Outreach_System.md`: Cold outreach, reminders, follow-ups.
- `03_Roundtable_Master_Script.md`: Full 60-min facilitation guide with embedded education.
- `04_Sales_Conversion.md`: Sales script & proposal.
- `05_Operations_Manual.md`: Tech checklist & scorecard.
```
