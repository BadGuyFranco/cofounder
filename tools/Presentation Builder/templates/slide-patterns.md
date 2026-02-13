# Slide Patterns

Reusable reveal.js HTML patterns. Each pattern shows the exact HTML to place inside `<div class="slides">`. Mix and match to build any presentation.

## Cover / Title Slide

Opening slide with title, subtitle, and optional branding.

```html
<section>
  <h1>Presentation Title</h1>
  <p style="opacity: 0.7; margin-top: 0.5em;">Subtitle or tagline goes here</p>
  <p class="attribution">Author Name | Date | Company</p>
</section>
```

## Section Divider

Full-width gradient background for separating major sections. Uses the `.section-slide` class for white text and `data-background-gradient` for the gradient.

```html
<section class="section-slide" data-background-gradient="linear-gradient(135deg, #42affa 0%, #1a6b99 100%)">
  <h2>Section Title</h2>
  <p>Brief context for what follows</p>
</section>
```

When using a brand, replace the gradient with the brand's primary/secondary colors.

## Standard Content

Default slide for text, lists, and inline elements.

```html
<section>
  <h2>Slide Title</h2>
  <p>Main point or context paragraph.</p>
  <ul>
    <li>First supporting point</li>
    <li>Second supporting point</li>
    <li>Third supporting point</li>
  </ul>
</section>
```

## Two-Column Comparison

Side-by-side content using the `.columns` utility.

```html
<section>
  <h2>Before vs. After</h2>
  <div class="columns">
    <div class="col">
      <h3>Before</h3>
      <ul>
        <li>Pain point one</li>
        <li>Pain point two</li>
        <li>Pain point three</li>
      </ul>
    </div>
    <div class="col">
      <h3>After</h3>
      <ul>
        <li>Benefit one</li>
        <li>Benefit two</li>
        <li>Benefit three</li>
      </ul>
    </div>
  </div>
</section>
```

## Image Right

Text on the left, image on the right.

```html
<section>
  <div class="columns">
    <div class="col">
      <h2>Slide Title</h2>
      <p>Descriptive text that accompanies the image. Keep to 3-4 lines for visual balance.</p>
      <ul>
        <li>Supporting point</li>
        <li>Supporting point</li>
      </ul>
    </div>
    <div class="col">
      <img src="Assets/photo.jpg" alt="Description">
    </div>
  </div>
</section>
```

Swap column order for Image Left.

## Full Image Background

Image fills the entire slide with optional text overlay.

```html
<section data-background-image="Assets/hero-image.jpg" data-background-size="cover">
  <h1 style="color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">Bold Statement</h1>
  <p style="color: #fff; opacity: 0.8;">Text overlaid on the background image</p>
</section>
```

## Quote / Testimonial

Centered quote with attribution.

```html
<section>
  <blockquote>"The quoted text goes here. Keep it impactful and concise."</blockquote>
  <p><strong>Attribution Name</strong> . Title, Company</p>
</section>
```

## Metrics / Data Highlight

Display key numbers prominently using the `.metrics` utility.

```html
<section>
  <h2>Key Results</h2>
  <div class="metrics">
    <div class="metric">
      <div class="number" style="color: var(--r-link-color);">47%</div>
      <div class="label">Revenue Growth</div>
    </div>
    <div class="metric">
      <div class="number" style="color: var(--r-link-color);">3.2x</div>
      <div class="label">ROI Achieved</div>
    </div>
    <div class="metric">
      <div class="number" style="color: var(--r-link-color);">92%</div>
      <div class="label">Client Retention</div>
    </div>
  </div>
</section>
```

With a brand, use `class="brand-primary"` on `.number` elements instead of inline styles.

## Code Walkthrough

Code block with syntax highlighting. Use `data-line-numbers` for step-through reveals.

```html
<section>
  <h2>Implementation</h2>
  <pre><code data-trim data-noescape data-line-numbers="1-3|5-8|1-8">
# Step 1: Define the model
class User(BaseModel):
    name: str

# Step 2: Create the endpoint
@app.post("/users")
async def create_user(user: User):
    return {"id": 1, "name": user.name}
  </code></pre>
  <p style="font-size: 0.5em; opacity: 0.6;">The <code>data-line-numbers="1-3|5-8|1-8"</code> attribute reveals lines progressively on click.</p>
</section>
```

## Code Comparison (Two Column)

Two code blocks side by side.

```html
<section>
  <h2>Before / After</h2>
  <div class="columns">
    <div class="col">
      <h3>Before</h3>
      <pre><code data-trim>
function getData() {
  return fetch('/api')
    .then(r => r.json())
    .then(d => d.data)
    .catch(e => console.error(e));
}
      </code></pre>
    </div>
    <div class="col">
      <h3>After</h3>
      <pre><code data-trim>
async function getData() {
  try {
    const res = await fetch('/api');
    const { data } = await res.json();
    return data;
  } catch (e) {
    console.error(e);
  }
}
      </code></pre>
    </div>
  </div>
</section>
```

## Timeline / Process Steps

Sequential steps using fragment animations.

```html
<section>
  <h2>Our Process</h2>
  <ol>
    <li class="fragment"><strong>Discovery</strong> . Understand the problem and audience</li>
    <li class="fragment"><strong>Strategy</strong> . Define the approach and success criteria</li>
    <li class="fragment"><strong>Execution</strong> . Build, test, and iterate</li>
    <li class="fragment"><strong>Delivery</strong> . Launch and measure results</li>
    <li class="fragment"><strong>Optimization</strong> . Refine based on data</li>
  </ol>
</section>
```

## Progressive Reveal (Fragment Animation)

Reveal bullet points one at a time.

```html
<section>
  <h2>Three Key Insights</h2>
  <ul>
    <li class="fragment">First insight that sets the foundation</li>
    <li class="fragment">Second insight that builds on the first</li>
    <li class="fragment">Third insight that delivers the punchline</li>
  </ul>
</section>
```

## Centered Statement

Single powerful statement, centered.

```html
<section>
  <h2>The one thing to remember</h2>
  <p style="opacity: 0.7; margin-top: 0.5em; font-size: 0.8em;">Supporting context that reinforces the statement</p>
</section>
```

## Table Slide

Standard HTML table.

```html
<section>
  <h2>Feature Comparison</h2>
  <table>
    <thead>
      <tr><th>Feature</th><th>Plan A</th><th>Plan B</th><th>Plan C</th></tr>
    </thead>
    <tbody>
      <tr><td>Users</td><td>10</td><td>100</td><td>Unlimited</td></tr>
      <tr><td>Storage</td><td>5 GB</td><td>50 GB</td><td>500 GB</td></tr>
      <tr><td>Support</td><td>Email</td><td>Priority</td><td>Dedicated</td></tr>
      <tr><td>Price</td><td>$29/mo</td><td>$99/mo</td><td>$299/mo</td></tr>
    </tbody>
  </table>
</section>
```

## End / Thank You

Closing slide.

```html
<section>
  <h2>Thank You</h2>
  <p>Questions?</p>
  <p class="attribution">name@example.com | @handle</p>
</section>
```

## Speaker Notes

Add notes visible in speaker view (press S during presentation). Place `<aside class="notes">` inside any slide section.

```html
<section>
  <h2>Slide Title</h2>
  <p>Content here</p>
  <aside class="notes">
    Speaker notes:
    - Remember to mention the client case study
    - Pause for questions after this slide
    - Transition: "Now let's look at the data..."
  </aside>
</section>
```

## Custom Background Colors

Set a background color on any slide.

```html
<section data-background-color="#1e293b">
  <h2 style="color: #fff;">Dark Background Slide</h2>
  <p style="color: #e2e8f0;">Content on a dark slide</p>
</section>
```

## Vertical Slides (Nested Sections)

Create a vertical slide stack by nesting `<section>` elements. Navigate down with arrow keys.

```html
<section>
  <section>
    <h2>Vertical Slide 1</h2>
    <p>Top of the stack (press down arrow)</p>
  </section>
  <section>
    <h2>Vertical Slide 2</h2>
    <p>Second in the stack</p>
  </section>
</section>
```

## Fragment Ordering

Control the order elements appear with `data-fragment-index`.

```html
<section>
  <h2>Custom Order</h2>
  <p class="fragment" data-fragment-index="3">This appears third</p>
  <p class="fragment" data-fragment-index="1">This appears first</p>
  <p class="fragment" data-fragment-index="2">This appears second</p>
</section>
```

## Fragment Styles

Different animation styles for fragments.

```html
<section>
  <h2>Fragment Styles</h2>
  <p class="fragment fade-in">Fade in</p>
  <p class="fragment fade-up">Fade up</p>
  <p class="fragment fade-out">Fade out (disappears)</p>
  <p class="fragment highlight-red">Highlight red</p>
  <p class="fragment highlight-blue">Highlight blue</p>
  <p class="fragment grow">Grow</p>
  <p class="fragment shrink">Shrink</p>
</section>
```

Available fragment classes: `fade-in`, `fade-out`, `fade-up`, `fade-down`, `fade-left`, `fade-right`, `fade-in-then-out`, `fade-in-then-semi-out`, `grow`, `shrink`, `strike`, `highlight-red`, `highlight-green`, `highlight-blue`, `highlight-current-red`, `highlight-current-green`, `highlight-current-blue`.
