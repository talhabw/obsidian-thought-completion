import { EditorView } from '@codemirror/view';
import { ThoughtCompletionSettings, SuggestionState, CompletionContext } from './types';
import { AIProvider } from './ai/provider';
import { extractContext, isInCodeBlock, isInFrontmatter } from './ai/context';
import { showSuggestion, clearSuggestion } from './editor/ghost-text';

type StateChangeCallback = (state: SuggestionState) => void;

// Debug flag - set to true to enable console logging
const DEBUG = false;

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[ThoughtCompletion]', ...args);
  }
}

/**
 * State machine for managing suggestion lifecycle
 * 
 * States:
 * - idle: Waiting for trigger
 * - queued: Trigger detected, waiting for delay before API call
 * - predicting: API call in progress
 * - suggesting: Showing ghost text
 * - disabled: Plugin disabled
 */
export class SuggestionStateMachine {
  private state: SuggestionState = 'idle';
  private queueTimer: ReturnType<typeof setTimeout> | null = null;
  private aiProvider: AIProvider;
  private currentView: EditorView | null = null;
  private stateChangeCallbacks: StateChangeCallback[] = [];

  constructor(private settings: ThoughtCompletionSettings) {
    this.aiProvider = new AIProvider(settings);
    
    if (!settings.enabled) {
      this.state = 'disabled';
    }
    debug('State machine created, initial state:', this.state);
  }

  /**
   * Get current state
   */
  getState(): SuggestionState {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update settings
   */
  updateSettings(settings: ThoughtCompletionSettings): void {
    this.settings = settings;
    this.aiProvider.updateSettings(settings);
    
    if (!settings.enabled && this.state !== 'disabled') {
      this.disable();
    } else if (settings.enabled && this.state === 'disabled') {
      this.enable();
    }
    debug('Settings updated, enabled:', settings.enabled, 'manualOnly:', settings.manualTriggerOnly);
  }

  /**
   * Set the current editor view
   */
  setView(view: EditorView | null): void {
    this.currentView = view;
  }

  /**
   * Trigger a suggestion (called when trigger conditions are met)
   * idle → queued
   */
  trigger(view: EditorView): void {
    debug('trigger() called, current state:', this.state);
    
    if (this.state === 'disabled') {
      debug('trigger() ignored: disabled');
      return;
    }
    if (this.settings.manualTriggerOnly) {
      debug('trigger() ignored: manualTriggerOnly');
      return;
    }

    this.currentView = view;

    // Check if we're in a context where suggestions don't make sense
    const doc = view.state.doc.toString();
    const pos = view.state.selection.main.head;
    
    if (isInCodeBlock(doc, pos)) {
      debug('trigger() ignored: in code block');
      return;
    }
    if (isInFrontmatter(doc, pos)) {
      debug('trigger() ignored: in frontmatter');
      return;
    }

    // If already queued or predicting, reset the timer
    if (this.state === 'queued') {
      debug('Already queued, resetting timer');
      this.cancelQueueTimer();
    } else if (this.state === 'predicting') {
      debug('Was predicting, aborting');
      this.aiProvider.abort();
    } else if (this.state === 'suggesting') {
      debug('Was suggesting, clearing');
      clearSuggestion(view);
    }

    this.setState('queued');
    this.startQueueTimer();
    debug('Now queued, timer started for', this.settings.triggerDelay, 'ms');
  }

  /**
   * Manually trigger a suggestion (ignores manualTriggerOnly setting)
   */
  manualTrigger(view: EditorView): void {
    debug('manualTrigger() called');
    
    if (this.state === 'disabled') {
      debug('manualTrigger() ignored: disabled');
      return;
    }

    this.currentView = view;

    // Check context
    const doc = view.state.doc.toString();
    const pos = view.state.selection.main.head;
    
    if (isInCodeBlock(doc, pos) || isInFrontmatter(doc, pos)) {
      debug('manualTrigger() ignored: in code block or frontmatter');
      return;
    }

    // Cancel any existing operations
    this.cancelQueueTimer();
    this.aiProvider.abort();
    if (this.state === 'suggesting') {
      clearSuggestion(view);
    }

    // Go directly to predicting (no delay for manual trigger)
    this.setState('predicting');
    debug('Going directly to predicting');
    this.predict();
  }

  /**
   * Cancel the queue (called when user types)
   * queued → idle
   * 
   * Note: This is called from within a CM6 update when docChanged.
   * The StateField already clears the decoration on docChanged, so we
   * don't need to dispatch anything - just update our internal state.
   */
  cancelQueue(): void {
    debug('cancelQueue() called, current state:', this.state);
    
    if (this.state === 'queued') {
      this.cancelQueueTimer();
      this.setState('idle');
    } else if (this.state === 'predicting') {
      this.aiProvider.abort();
      this.setState('idle');
    } else if (this.state === 'suggesting') {
      // The StateField automatically clears decoration on docChanged,
      // so we just need to update our internal state
      this.setState('idle');
    }
  }

  /**
   * Dismiss the current suggestion
   * suggesting → idle
   * 
   * Note: May be called from CM6 update, so defer the dispatch.
   */
  dismiss(): void {
    if (this.state === 'suggesting' && this.currentView) {
      const view = this.currentView;
      this.setState('idle');
      requestAnimationFrame(() => {
        clearSuggestion(view);
      });
    }
  }

  /**
   * Disable the plugin
   * any → disabled
   */
  disable(): void {
    this.cancelQueueTimer();
    this.aiProvider.abort();
    if (this.state === 'suggesting' && this.currentView) {
      clearSuggestion(this.currentView);
    }
    this.setState('disabled');
  }

  /**
   * Enable the plugin
   * disabled → idle
   */
  enable(): void {
    if (this.state === 'disabled') {
      this.setState('idle');
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cancelQueueTimer();
    this.aiProvider.abort();
    this.stateChangeCallbacks = [];
  }

  // Private methods

  private setState(newState: SuggestionState): void {
    if (this.state !== newState) {
      debug('State:', this.state, '→', newState);
      this.state = newState;
      for (const callback of this.stateChangeCallbacks) {
        callback(newState);
      }
    }
  }

  private startQueueTimer(): void {
    this.queueTimer = setTimeout(() => {
      this.queueTimer = null;
      debug('Queue timer fired, current state:', this.state);
      if (this.state === 'queued') {
        this.setState('predicting');
        this.predict();
      }
    }, this.settings.triggerDelay);
  }

  private cancelQueueTimer(): void {
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
      debug('Queue timer cancelled');
    }
  }

  private async predict(): Promise<void> {
    debug('predict() called');
    
    if (!this.currentView || this.state !== 'predicting') {
      debug('predict() aborted: no view or wrong state');
      return;
    }

    const view = this.currentView;
    
    // Extract context
    const contextData = extractContext(
      view,
      this.settings.contextChars,
      this.settings.includeHeadingTrail
    );

    const context: CompletionContext = {
      ...contextData,
      mode: this.settings.mode,
    };

    debug('Calling AI with context, prefix length:', context.prefix.length);

    // Get suggestion from AI
    const suggestion = await this.aiProvider.complete(context);

    debug('AI returned:', suggestion ? suggestion.substring(0, 50) + '...' : 'null');

    // Check if we're still in predicting state (could have been cancelled)
    if (this.state !== 'predicting') {
      debug('State changed during prediction, aborting');
      return;
    }

    if (suggestion) {
      // Verify cursor hasn't moved
      const currentPos = view.state.selection.main.head;
      if (currentPos === context.cursorPosition) {
        showSuggestion(view, suggestion);
        this.setState('suggesting');
      } else {
        debug('Cursor moved, discarding suggestion');
        this.setState('idle');
      }
    } else {
      this.setState('idle');
    }
  }
}
