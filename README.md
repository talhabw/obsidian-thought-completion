# Thought Completion

A thinking companion for Obsidian that suggests what to think or write about next.

Like IDE tab completion, but for your thoughts. It shows gentle nudges at your cursor to help you develop your ideas, without writing content for you.

## How It Works

As you write, the plugin analyzes your context and suggests thinking prompts like:

- "What example could illustrate this?"
- "What's the counterargument?"
- "How does this connect to [topic you mentioned]?"
- "What would need to be true for this to work?"

Suggestions appear as faded ghost text at your cursor. They help you decide *what* to write and think about, they don't write for you.

## Features

- **Ghost text suggestions** — Appear inline at your cursor, styled as faded italic text
- **Multiple suggestion modes:**
  - **Auto** — AI picks the best type of nudge
  - **Questions** — Thought-provoking questions
  - **Structural** — Organizational suggestions
  - **Critical** — Counterpoints and challenges
  - **Connector** — Links and connections between ideas
- **Smart triggers** — Suggestions appear after pauses, punctuation, or newlines
- **Manual trigger** — Use a command to request a suggestion anytime
- **Status bar indicator** — Shows current state (Idle, Queued, Thinking, Suggesting)
- **Configurable** — Adjust trigger delay, context size, and model parameters

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings → Community plugins
2. Click "Browse" and search for "Thought Completion"
3. Click Install, then Enable

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`)
2. Create a folder: `<your-vault>/.obsidian/plugins/thought-completion/`
3. Copy the downloaded files into this folder
4. Restart Obsidian and enable the plugin in Settings → Community plugins

## Configuration

### Required: API Setup

This plugin requires an OpenAI-compatible API. Go to Settings → Thought Completion and configure:

| Setting | Description | Example |
|---------|-------------|---------|
| API Endpoint | Your API endpoint URL | `https://api.openai.com/v1` |
| API Key | Your API key | `...` |
| Model | Model name to use | `gpt-4o-mini` |

**Compatible providers:**
- OpenAI (`https://api.openai.com/v1`)
- OpenRouter (`https://openrouter.ai/api/v1`)
- Any OpenAI-compatible API (Ollama, LM Studio, etc.)

### Suggestion Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Mode | Auto | Type of thinking nudges (Auto, Questions, Structural, Critical, Connector) |
| Trigger delay | 2000ms | Time to wait after typing stops before suggesting |
| Trigger on punctuation | On | Suggest after sentence-ending punctuation (. ! ?) |
| Trigger on newline | On | Suggest after pressing Enter |
| Manual trigger only | Off | Only suggest when manually triggered |

### Context Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Context characters | 1500 | How much surrounding text to send to the AI |
| Include heading trail | On | Include current heading hierarchy for context |

### Model Parameters

| Setting | Default | Description |
|---------|---------|-------------|
| Max tokens | 500 | Maximum response length. Increase for reasoning models. |
| Temperature | 0.7 | Creativity level (0 = focused, 1 = creative) |

## Commands

Access these from the Command Palette (Ctrl/Cmd + P):

- **Trigger suggestion** — Manually request a suggestion
- **Dismiss suggestion** — Clear the current suggestion
- **Toggle suggestions on/off** — Enable/disable the plugin
- **Set mode: Auto/Questions/Structural/Critical/Connector** — Switch suggestion modes

## Tips

### For Reasoning Models

If you're using a reasoning model (like `nvidia/nemotron-*`), consider increasing **Max tokens**. These models use tokens for chain-of-thought before outputting the answer.

### Privacy

- Your note content (limited by "Context characters" setting) is sent to your configured API
- API keys are stored locally in your Obsidian vault
- No data is sent anywhere except your configured API endpoint

### Best Results

- Use a fast, inexpensive model for quick suggestions (e.g., `nvidia/nemotron`)
- Adjust trigger delay based on your writing pace
- Try different modes to see what works for your thinking style

## Development

```bash
# Install dependencies
bun install

# Build for development (watch mode)
bun run dev

# Build for production
bun run build
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Inspired by IDE code completion and the [obsidian-copilot-auto-completion](https://github.com/j0rd1smit/obsidian-copilot-auto-completion) plugin architecture.
