import { App, PluginSettingTab, Setting } from 'obsidian';
import type ThoughtCompletionPlugin from './main';
import { SuggestionMode, SuggestionCase } from './types';

export class ThoughtCompletionSettingTab extends PluginSettingTab {
  plugin: ThoughtCompletionPlugin;

  constructor(app: App, plugin: ThoughtCompletionPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Enable/Disable
    new Setting(containerEl)
      .setName('Enable suggestions')
      .setDesc('Turn thought suggestions on or off')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enabled)
        .onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
        }));

    // API Configuration Section
    new Setting(containerEl)
      .setName('API configuration')
      .setHeading();

    new Setting(containerEl)
      .setName('API endpoint')
      .setDesc('OpenAI-compatible API endpoint (e.g., https://api.openai.com/v1)')
      .addText(text => text
        .setPlaceholder('https://api.openai.com/v1')
        .setValue(this.plugin.settings.apiEndpoint)
        .onChange(async (value) => {
          this.plugin.settings.apiEndpoint = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('API key')
      .setDesc('Your API key (stored locally)')
      .addText(text => {
        text
          .setPlaceholder('sk-...')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      });

    new Setting(containerEl)
      .setName('Model')
      .setDesc('Model name to use (e.g., gpt-4o-mini, claude-3-haiku)')
      .addText(text => text
        .setPlaceholder('gpt-4o-mini')
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        }));

    // Suggestion Style Section
    new Setting(containerEl)
      .setName('Suggestion style')
      .setHeading();

    new Setting(containerEl)
      .setName('Mode')
      .setDesc('What type of thinking nudges do you want?')
      .addDropdown(dropdown => dropdown
        .addOption('auto', 'Auto (AI picks)')
        .addOption('questions', 'Questions (thought-provoking)')
        .addOption('structural', 'Structural (organization)')
        .addOption('critical', 'Critical (counterpoints)')
        .addOption('connector', 'Connector (links & connections)')
        .setValue(this.plugin.settings.mode)
        .onChange(async (value) => {
          this.plugin.settings.mode = value as SuggestionMode;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Letter case')
      .setDesc('Transform suggestion capitalization')
      .addDropdown(dropdown => dropdown
        .addOption('none', 'Keep as-is')
        .addOption('lower', 'all lowercase')
        .addOption('firstLower', 'first letter lowercase')
        .setValue(this.plugin.settings.suggestionCase)
        .onChange(async (value) => {
          this.plugin.settings.suggestionCase = value as SuggestionCase;
          await this.plugin.saveSettings();
        }));

    // Triggers Section
    new Setting(containerEl)
      .setName('Triggers')
      .setHeading();

    new Setting(containerEl)
      .setName('Manual trigger only')
      .setDesc('Only show suggestions when you manually trigger them (via command)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.manualTriggerOnly)
        .onChange(async (value) => {
          this.plugin.settings.manualTriggerOnly = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide other trigger options
        }));

    if (!this.plugin.settings.manualTriggerOnly) {
      new Setting(containerEl)
        .setName('Trigger delay')
        .setDesc('How long to wait after typing stops before suggesting (ms)')
        .addSlider(slider => slider
          .setLimits(500, 5000, 100)
          .setValue(this.plugin.settings.triggerDelay)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.triggerDelay = value;
            await this.plugin.saveSettings();
          }));

      new Setting(containerEl)
        .setName('Trigger on punctuation')
        .setDesc('Suggest after sentence-ending punctuation (. ! ?)')
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.triggerOnPunctuation)
          .onChange(async (value) => {
            this.plugin.settings.triggerOnPunctuation = value;
            await this.plugin.saveSettings();
          }));

      new Setting(containerEl)
        .setName('Trigger on newline')
        .setDesc('Suggest after pressing Enter')
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.triggerOnNewline)
          .onChange(async (value) => {
            this.plugin.settings.triggerOnNewline = value;
            await this.plugin.saveSettings();
          }));
    }

    // Context Section
    new Setting(containerEl)
      .setName('Context')
      .setHeading();

    new Setting(containerEl)
      .setName('Context characters')
      .setDesc('How much surrounding text to send to the AI (characters)')
      .addSlider(slider => slider
        .setLimits(500, 4000, 100)
        .setValue(this.plugin.settings.contextChars)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.contextChars = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Include heading trail')
      .setDesc('Include the current heading hierarchy for context')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.includeHeadingTrail)
        .onChange(async (value) => {
          this.plugin.settings.includeHeadingTrail = value;
          await this.plugin.saveSettings();
        }));

    // Model Parameters Section
    new Setting(containerEl)
      .setName('Model parameters')
      .setHeading();

    new Setting(containerEl)
      .setName('Max tokens')
      .setDesc('Maximum response length. Reasoning models need higher values (500+).')
      .addSlider(slider => slider
        .setLimits(50, 2000, 50)
        .setValue(this.plugin.settings.maxTokens)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.maxTokens = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Temperature')
      .setDesc('Creativity level (0 = focused, 1 = creative)')
      .addSlider(slider => slider
        .setLimits(0, 1, 0.1)
        .setValue(this.plugin.settings.temperature)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.temperature = value;
          await this.plugin.saveSettings();
        }));

    // Interface Section
    new Setting(containerEl)
      .setName('Interface')
      .setHeading();

    new Setting(containerEl)
      .setName('Show status bar')
      .setDesc('Show plugin state in the bottom status bar')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showStatusBar)
        .onChange(async (value) => {
          this.plugin.settings.showStatusBar = value;
          await this.plugin.saveSettings();
        }));
  }
}
