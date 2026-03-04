# xAI Connector Capabilities

What this connector can do for you.

## Chat & Generation

- Send messages to Grok and get responses
- Use a system prompt to set tone, role, or constraints
- Control output length and temperature
- Request JSON-formatted output
- Choose between Grok models (flagship, mini, vision)

## Discovery

- List all currently available Grok models

## Limitations

- No streaming support (response returned in full)
- No image input in this connector (use `grok-2-vision` model but input must be URL-based)
- No fine-tuning management
- Rate limits vary by plan tier
- Context window depends on model (check xAI docs for current limits)
