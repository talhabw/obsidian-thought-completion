import { Plugin, MarkdownView } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { ThoughtCompletionSettings, DEFAULT_SETTINGS, SuggestionMode, SuggestionState } from './types';
import { ThoughtCompletionSettingTab } from './settings';
import { SuggestionStateMachine } from './state-machine';
import { createThoughtCompletionExtension } from './editor/extension';

// State display names for status bar
const STATE_DISPLAY: Record<SuggestionState, string> = {
  idle: 'Idle',
  queued: 'Queued...',
  predicting: 'Thinking...',
  suggesting: 'Suggesting',
  disabled: 'Off',
};

export default class ThoughtCompletionPlugin extends Plugin {
  settings: ThoughtCompletionSettings = DEFAULT_SETTINGS;
  private stateMachine: SuggestionStateMachine | null = null;
  private statusBarEl: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Create the state machine
    this.stateMachine = new SuggestionStateMachine(this.settings);

    // Create status bar item (if enabled)
    if (this.settings.showStatusBar) {
      this.statusBarEl = this.addStatusBarItem();
      this.updateStatusBar(this.stateMachine.getState());
    }

    // Subscribe to state changes for status bar updates
    this.stateMachine.onStateChange((state) => {
      this.updateStatusBar(state);
    });

    // Register the CodeMirror extension
    this.registerEditorExtension(
      createThoughtCompletionExtension(
        () => this.settings,
        this.stateMachine
      )
    );

    // Add settings tab
    this.addSettingTab(new ThoughtCompletionSettingTab(this.app, this));

    // Add commands
    this.addCommand({
      id: 'trigger-suggestion',
      name: 'Trigger suggestion',
      editorCallback: (editor, ctx) => {
        if (ctx instanceof MarkdownView) {
          const editorView = this.getEditorView(ctx);
          if (editorView && this.stateMachine) {
            this.stateMachine.manualTrigger(editorView);
          }
        }
      },
    });

    this.addCommand({
      id: 'dismiss-suggestion',
      name: 'Dismiss suggestion',
      editorCallback: () => {
        if (this.stateMachine) {
          this.stateMachine.dismiss();
        }
      },
    });

    this.addCommand({
      id: 'toggle-enabled',
      name: 'Toggle suggestions on/off',
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveSettings();
        if (this.stateMachine) {
          this.stateMachine.updateSettings(this.settings);
        }
      },
    });

    // Mode switching commands
    const modes: { id: string; name: string; mode: SuggestionMode }[] = [
      { id: 'mode-auto', name: 'Set mode: Auto', mode: 'auto' },
      { id: 'mode-questions', name: 'Set mode: Questions', mode: 'questions' },
      { id: 'mode-structural', name: 'Set mode: Structural', mode: 'structural' },
      { id: 'mode-critical', name: 'Set mode: Critical', mode: 'critical' },
      { id: 'mode-connector', name: 'Set mode: Connector', mode: 'connector' },
    ];

    for (const { id, name, mode } of modes) {
      this.addCommand({
        id,
        name,
        callback: async () => {
          this.settings.mode = mode;
          await this.saveSettings();
          if (this.stateMachine) {
            this.stateMachine.updateSettings(this.settings);
          }
        },
      });
    }
  }

  onunload(): void {
    if (this.stateMachine) {
      this.stateMachine.destroy();
      this.stateMachine = null;
    }
    this.statusBarEl = null;
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    if (this.stateMachine) {
      this.stateMachine.updateSettings(this.settings);
    }
    this.updateStatusBarVisibility();
  }

  /**
   * Update status bar visibility based on settings
   */
  private updateStatusBarVisibility(): void {
    if (this.settings.showStatusBar && !this.statusBarEl) {
      // Enable status bar
      this.statusBarEl = this.addStatusBarItem();
      if (this.stateMachine) {
        this.updateStatusBar(this.stateMachine.getState());
      }
    } else if (!this.settings.showStatusBar && this.statusBarEl) {
      // Disable status bar
      this.statusBarEl.remove();
      this.statusBarEl = null;
    }
  }

  /**
   * Update the status bar with current state
   */
  private updateStatusBar(state: SuggestionState): void {
    if (!this.statusBarEl) return;
    
    const modeLabel = this.settings.mode.charAt(0).toUpperCase() + this.settings.mode.slice(1);
    const stateLabel = STATE_DISPLAY[state];
    
    this.statusBarEl.setText(`Thought: ${stateLabel} (${modeLabel})`);
    
    // Add visual indicator for active states
    this.statusBarEl.removeClass('tc-idle', 'tc-queued', 'tc-predicting', 'tc-suggesting', 'tc-disabled');
    this.statusBarEl.addClass(`tc-${state}`);
  }

  /**
   * Get the CodeMirror EditorView from an Obsidian MarkdownView
   */
  private getEditorView(view: MarkdownView): EditorView | null {
    // @ts-expect-error - cm property is not in the official types
    return view.editor?.cm as EditorView | undefined ?? null;
  }
}
