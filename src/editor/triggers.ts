import {
  ViewPlugin,
  ViewUpdate,
  EditorView,
} from '@codemirror/view';
import { ThoughtCompletionSettings } from '../types';
import { SuggestionStateMachine } from '../state-machine';

// Debug flag
const DEBUG = false;

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[ThoughtCompletion:Triggers]', ...args);
  }
}

/**
 * Create a trigger plugin that watches for trigger conditions
 */
export function createTriggerPlugin(
  getSettings: () => ThoughtCompletionSettings,
  stateMachine: SuggestionStateMachine
) {
  return ViewPlugin.fromClass(
    class TriggerPlugin {
      private lastDocLength: number;
      private idleTimer: ReturnType<typeof setTimeout> | null = null;

      constructor(view: EditorView) {
        this.lastDocLength = view.state.doc.length;
        stateMachine.setView(view);
        debug('TriggerPlugin created');
      }

      update(update: ViewUpdate): void {
        const settings = getSettings();

        // Update the view reference
        stateMachine.setView(update.view);

        // If disabled or manual only, don't auto-trigger
        if (!settings.enabled) {
          debug('update() skipped: disabled');
          return;
        }
        if (settings.manualTriggerOnly) {
          debug('update() skipped: manualTriggerOnly');
          return;
        }

        if (update.docChanged) {
          const newLength = update.state.doc.length;
          const isTyping = newLength > this.lastDocLength;
          const lengthDiff = newLength - this.lastDocLength;
          this.lastDocLength = newLength;

          debug('docChanged, isTyping:', isTyping, 'lengthDiff:', lengthDiff);

          // Cancel any pending suggestion when typing
          stateMachine.cancelQueue();

          // Reset idle timer
          this.resetIdleTimer(update.view, settings);

          // Check for immediate triggers
          if (isTyping) {
            this.checkTriggers(update, settings);
          }
        }

        // Handle selection changes (cursor moved without doc change)
        if (update.selectionSet && !update.docChanged) {
          debug('Selection changed without doc change');
          // Dismiss suggestion if cursor moved
          stateMachine.dismiss();
        }
      }

      destroy(): void {
        this.clearIdleTimer();
        debug('TriggerPlugin destroyed');
      }

      private checkTriggers(update: ViewUpdate, settings: ThoughtCompletionSettings): void {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        const charBefore = pos > line.from ? update.state.doc.sliceString(pos - 1, pos) : '';

        debug('checkTriggers, charBefore:', JSON.stringify(charBefore), 'pos:', pos, 'line.to:', line.to);

        // Check punctuation trigger
        if (settings.triggerOnPunctuation) {
          debug('triggerOnPunctuation enabled');
          if (/[.!?]/.test(charBefore)) {
            debug('Punctuation detected:', charBefore);
            // Only trigger if followed by space or end of line
            const charAfter = pos < update.state.doc.length 
              ? update.state.doc.sliceString(pos, pos + 1) 
              : '';
            debug('charAfter:', JSON.stringify(charAfter), 'pos === line.to:', pos === line.to);
            
            if (!charAfter || /\s/.test(charAfter) || pos === line.to) {
              debug('Punctuation trigger firing!');
              stateMachine.trigger(update.view);
              return;
            } else {
              debug('Punctuation trigger skipped: char after is not space/EOL');
            }
          }
        }

        // Check newline trigger
        if (settings.triggerOnNewline) {
          debug('triggerOnNewline enabled, checking transactions...');
          // Check if a newline was just inserted
          for (const tr of update.transactions) {
            if (tr.isUserEvent('input.type')) {
              tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                const insertedText = inserted.toString();
                debug('Change inserted:', JSON.stringify(insertedText));
                if (insertedText.includes('\n')) {
                  debug('Newline trigger firing!');
                  stateMachine.trigger(update.view);
                }
              });
            }
          }
        }
      }

      private resetIdleTimer(view: EditorView, settings: ThoughtCompletionSettings): void {
        this.clearIdleTimer();
        
        debug('Idle timer reset, will fire in', settings.triggerDelay, 'ms');
        
        // Start new idle timer
        this.idleTimer = setTimeout(() => {
          this.idleTimer = null;
          debug('Idle timer fired');
          if (settings.enabled && !settings.manualTriggerOnly) {
            stateMachine.trigger(view);
          }
        }, settings.triggerDelay);
      }

      private clearIdleTimer(): void {
        if (this.idleTimer) {
          clearTimeout(this.idleTimer);
          this.idleTimer = null;
        }
      }
    }
  );
}
