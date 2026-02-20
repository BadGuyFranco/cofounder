# 03 — Roundtable Master Script Engine

## Purpose
This is the **Single Source of Truth** for the live event. It consolidates the Run of Show, Facilitation Guidelines, and the Education Segment into one chronological, executable script.

**Goal**: Produce `03_Roundtable_Master_Script.md`. The user should strictly follow this file during the Zoom call. No other file is needed.

**CRITICAL**: This engine MUST enforce "Pre-Webinar" setup and "Slide Cues" even if the user says "no slides" (we use cues for visual anchors anyway).

---

## The 60-Minute Arc (Strict Chronology)

1.  **Pre-Webinar (-10 to 0)**: Tech check, warm-up chat, camera nudges.
2.  **The Hook (0-5)**: Intro, credibility, "Why we are here."
3.  **The Discussion (5-30)**: "What's Working" & "Challenges." (Mining pain).
4.  **The Shift (Education) (30-50)**: Story, New Belief, Method, Proof, Open Loop.
5.  **The Close (50-60)**: Q&A, Offer, Booking Link.

---

## Content Injection Rules

- **From Strategy Brief**: Pull Topic, 180 Shift, Story, Method.
- **Slide Cues**: Insert `>>> SHOW SLIDE [Number]: [Description]` cues at key visual moments (Title, Maturity Model/Shift, Method, Offer/QR).
- **Chat Prompts**: Embed `>>> PASTE INTO CHAT:` blocks directly in the flow.

---

## Output Structure: `03_Roundtable_Master_Script.md`

```markdown
# Roundtable Master Script
**Topic**: [Topic]
**Duration**: 60 Minutes

---

## [Time: -10:00 to 00:00] PRE-WEBINAR & SETUP
**Goal**: Warm up the room.
- [ ] Check mic/camera.
- [ ] Open Chat panel.
- [ ] Have [Booking Link] ready.

**Chat Prompt**:
>>> PASTE INTO CHAT: Welcome! Please drop your name and location while we wait.

**Spoken**: "Welcome everyone, we'll start in 2 minutes. If you can, turn cameras on—this is a roundtable, not a webinar..."

---

## [Time: 00:00 to 05:00] THE HOOK & INTRO
**Goal**: Establish authority & rules.
>>> SHOW SLIDE 1: Title Slide

**Spoken**: "I'm [Name]. I invited you here because..."

---

## [Time: 05:00 to 30:00] THE DISCUSSION
**Goal**: Agitate the problem.

**Chat Prompt (What's Working)**:
>>> PASTE INTO CHAT: What is ONE thing working well for you right now regarding [Topic]?

**Facilitation**:
- "I see [Name] mentioned X. Unmute and tell us more..."

**Chat Prompt (Challenges)**:
>>> PASTE INTO CHAT: What is your #1 frustration with [Topic]?

**Facilitation (The Mining)**:
- "Who feels like [Challenge] is costing them money?"

---

## [Time: 30:00 to 50:00] THE EDUCATION (The 180° Shift)
**Goal**: Change their belief.

**Transition**: "Thank you for being open. I want to show you why that's happening..."

>>> SHOW SLIDE 2: The Shift / Maturity Model

**The Story**:
[Full Script of Origin Story from Strategy Brief]

**The Shift**:
"Most people think [Old Belief]. But actually [New Belief]..."

**The Method**:
>>> SHOW SLIDE 3: The Method Framework
"Here are the 3 steps..."

**The Open Loop**:
"But knowing the steps isn't enough..."

---

## [Time: 50:00 to 60:00] THE CLOSE
**Goal**: Book appointments.

>>> SHOW SLIDE 4: Offer & QR Code

**The Offer**:
"I'm opening up 5 spots for a [Audit/Strategy Call]..."

**Chat Prompt**:
>>> PASTE INTO CHAT: BOOK HERE: [Link]

**Spoken**:
"Click the link now. I'll wait."
```
