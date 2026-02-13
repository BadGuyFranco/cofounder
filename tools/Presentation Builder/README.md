# Presentation Builder

Create professional, audience-calibrated presentations using reveal.js. Output is a self-contained folder you can present by double-clicking the HTML file. No server, no build step, no npm install required to view.

## Documentation

See **AGENTS.md** for complete instructions, methodology, and usage.

## Key Features

- AI-driven content methodology for structuring impactful presentations
- reveal.js rendering with transitions, fragments, speaker notes, and code highlighting
- Self-contained output: one HTML file + one assets folder, works from `file://`
- Export to PDF or PNG via Playwright
- 14 built-in themes (light, dark, and specialty)
- Brand template system for consistent visual identity across presentations
- Reusable slide pattern library (cover, comparison, code walkthrough, metrics, quote, timeline)
- Optional integration with Proposal Author for proposal-to-deck conversion
- Per-project AGENTS.md for easy resumption and iteration

## Common Use Cases

- Business presentations (pitches, strategy, client decks, board decks)
- Technical talks (architecture reviews, demos, conference talks)
- Educational content (workshops, courses, webinars)
- Converting Proposal Author projects into slide decks

## Output Format

Each presentation is a portable folder:

```
My Presentation/
  My Presentation.html          <-- double-click to present
  My Presentation Assets/       <-- reveal.js runtime and theme
    reveal.js
    reveal.css
    theme.css
    highlight.js
    monokai.css
    notes.js
```

No dependencies to install. Works in Chrome, Safari, and Firefox.
