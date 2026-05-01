# What's New in CoFounder

## May 1, 2026
- **Documentor local-generator** - New `--style resume` profile for ATS-compliant beautiful resumes. Pandoc-based DOCX generation using a programmatically built reference template (Georgia body, Calibri headings, deep teal #0F4C5C accent, custom paragraph styles for tagline and contact line). PDF pipeline mirrors the same design tokens via Playwright. Includes a Pandoc fenced div preprocessor so the same Markdown source produces consistent DOCX and PDF.

## March 22, 2026
- **Stripe connector** - Full Stripe API coverage with 26 scripts (up from 4). Now supports multi-account credentials, test/live mode switching per command, and every Stripe API domain: payments, billing, checkout, balance, coupons, disputes, files, quotes, meters, shipping, customer portal, Connect, Issuing, Terminal, Treasury, and Identity.
- **Zoho connector** - Calendar and mail scripts, updated auth and field utilities.
- **Designer tool** - New design tool for visual designs, design systems, color palettes, wireframes, and components.
- **Documentor** - Updated local generator scripts and dependencies.

## March 14, 2026
- **Browser Control** - MCP server mode, snapshot and click reliability improvements, new Ahrefs site guide, updated LinkedIn/PodMatch/Google Sheets site guides.
- **SEO Expert** - Ahrefs integration via Browser Control for automated backlink and keyword gap analysis when configured.
- **Transcriber** - Fixed FFmpeg install instruction to use conda instead of Homebrew.
- **Development standards** - Added runtime environment policy (Miniforge/conda for all system dependencies).

## March 13, 2026
- **Design Advisor** - New tool for design quality guidance. Covers typography, color, layout, spatial design, motion, interaction design, responsive design, and UX writing. Includes a web-frontend domain for building frontend components with intentional design choices instead of generic AI aesthetics.
- **Playbook Author** - Merged improvements from autoresearch experiments: risk-first planning (risks identified in Interrogate before the plan is designed), questions with recommended defaults, measurable completion criteria, token-efficient output, and a tighter playbook template.

## February 22, 2026
- **SEO Expert** - Now maintains a persistent `seo/` directory per site with dated plan folders, an asset library, a fixed-schema `history.md` for tracking KPIs across audits, a prioritized `todos.md` for cross-plan carry-forward items, and a content folder for SEO-produced content. Every session opens with a history update and todos review before auditing. See migration note if you have existing SEO plans.

## February 21, 2026
- **Update notifications** - CoFounder now shows what's new after every update, surfacing only the changes since your last sync. Includes full history going back to the original December 2025 release.

## February 20, 2026
- **Bug reporting** - If something in CoFounder stops working, your AI assistant will now offer to file a bug report automatically. Reports go directly to the CoFounder team. You can opt in to receive an email notification when your specific bug is fixed, with no extra account or credentials required on your end.
- **SEO Expert** - New tool for comprehensive SEO audits. Covers technical SEO, on-page, content, backlinks, structured data, and LLM findability. Includes a Generate layer (schema markup, title tags, meta descriptions, llms.txt, redirect maps) and an Execute layer (sitemap submission, URL indexing, WordPress and Cloudflare integration). Works with Google Search Console, PageSpeed Insights, Bing, and DataForSEO.
- **Bing Webmaster Tools connector** - Manage sites and sitemaps, check crawl stats, submit URLs, and pull keyword data from Bing.
- **DataForSEO connector** - Keyword research, SERP rank checking, domain overview, competitor discovery, keyword gap analysis, and backlink data.
- **Google Search Console connector** - Search analytics, URL inspection, and sitemap management via Google connector.
- **Google PageSpeed connector** - Core Web Vitals, performance scores, and optimization opportunities via Google connector.

## February 12, 2026
- **Proposal Author** - New tool for writing compelling proposals and persuasive documents.
- **Presentation Builder** - New tool for creating presentations, pitch decks, and slide decks.

## February 10, 2026
- **GoHighLevel connector** - Fixed payment and product amount handling; corrected product price API endpoints.

## February 5, 2026
- **Figma connector** - Retrieve files, projects, and components; export assets directly from Figma.
- **Image Generator** - Now enhances prompts automatically for better image quality before generating. Improved black-and-white mode uses true colorspace instead of desaturation.
- **Cloud-sync compatibility** - Dependency installation now works reliably on Google Drive and Dropbox-synced workspaces.

## January 29, 2026
- **Documentor** - New edit workflow: replace document content without breaking existing URLs or document IDs.

## January 28, 2026
- **Google connector** - New commands: clear a document's contents, set contents from text or file, and rename documents. Works with Shared Drives.
- **Zoom connector** - New connector for meeting management, recordings, webinars, users, groups, and reports.
- **Dependency management** - Faster and more reliable on synced filesystems (Google Drive, Dropbox). Now continues running after install instead of requiring a re-run.
- **Image Generator** - HTML capture now auto-fits to content height. New `--full-page` flag for full-page captures.
- **Tool renaming** - Planner is now Playbook Author. Prompt Author is now Play Author. These names align with WISER Method terminology.

## January 24, 2026
- **Secondary voice support** - Set up separate voice profiles for specific brands or clients alongside your personal voice.
- **Auto dependency install** - Connectors and tools now install their npm dependencies automatically on first use. No manual setup required.
- **Claude Code support** - CoFounder now works with Claude Code in addition to Cursor and other AI IDEs.

## January 23, 2026
- **Google Docs** - New document conversion capabilities: convert other formats into Google Docs via the Google connector.
- **Image Generator** - Now supports taking screenshots of web pages and converting SVG or HTML files to images.
- **Playbook Author** - Rebuilt using the full WISER framework for collaborative planning.
- **Replicate connector** - Improved prediction handling with status polling so long-running generations complete reliably.

## January 20, 2026
- **Browser Control** - Improved setup process with clearer verification steps. Better Windows compatibility.

## January 19, 2026
- **Windows** - Significantly improved compatibility across the installer, terminal routing, and all tools. Git Bash paths now handle spaces correctly. IDE detection works for Windsurf and Cursor.
- **Antigravity IDE** - Added support for the Antigravity IDE during setup.

## January 17, 2026
- **Updates now use git** - CoFounder switched from re-downloading a zip to a git-based update system. You now get updates with a simple `git pull`, and your AI assistant can check for migrations automatically. Much faster and more reliable.
- **Installer restructure** - Cleaner first-time setup that only installs what you actually need, when you need it. Dependencies for tools like Image Generator and Transcriber are now installed on-demand rather than all at once.

## January 16, 2026
- **Update CoFounder command** - You can now say "update cofounder" and your AI assistant handles the full update process including migrations.

## January 15, 2026
- **Windows support** - Full Windows compatibility added across the entire toolkit. Git Bash is now the standard terminal on Windows with automatic detection and setup.
- **Miniforge replaces Homebrew** - Python environment setup now uses Miniforge instead of Homebrew/Xcode, which works on both Mac and Windows. Includes GPU acceleration support.
- **Path resolution** - All tools and connectors now resolve paths correctly regardless of which folder they are run from.

## January 13, 2026
- **Connectors library** - Added 13 platform connectors: Airtable, Google, HubSpot, LinkedIn, Make, Meetup, Monday, Notion, Replicate, Supabase, X (Twitter), GoHighLevel, and HeyGen. Image Generator and Video Generator now use these shared connectors.
- **Browser Control** - Added setup guide and improved documentation.

## January 11, 2026
- **Documentor** - Now uses the Google connector for authentication, consistent with all other Google-connected tools.

## January 10, 2026
- **Documentor** - New tool for generating and editing documents (Google Docs, Word, PDF).
- **Play Author** - Updated with improved review process.
- **File versioning** - CoFounder now archives files before major rewrites or deletions so nothing is permanently lost.

## January 9, 2026
- **Playbook Author** - New tool for creating execution plans, playbooks, and project roadmaps.
- **Transcriber** - Voice Transcription tool renamed to Transcriber with improved setup.
- **Renamed to CoFounder** - The toolkit was previously called Pro Accelerator. All internal references updated.

## January 6, 2026
- **Transcriber** - Switched back to Python for GPU acceleration. Processing a 160-minute audio file dropped from 2+ hours to ~25 minutes on a GPU-equipped machine.
- **Researcher** - New tool for research with verified sources.
- **Tools migrated to JavaScript** - Image Generator, Video Generator, and other tools converted from Python to Node.js. Faster startup and no Python environment required for most tools.

## January 5, 2026
- **Marketing System** - Restructured with new category-based framework covering funnels, growth engines, persuasion, psychology, measurement, and more.
- **Content Author** - Updated long-form writing and content review workflows.
- **Visualizer** - Updated scripts and documentation.

## December 23, 2025
- **Initial release** - CoFounder launched with Content Author, Image Generator, Video Generator, Voice Transcription, Visualizer, Marketing System, and the core tool and connector framework.
