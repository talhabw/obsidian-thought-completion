import { keymap, EditorView } from '@codemirror/view';
import { Prec, Extension } from '@codemirror/state';
import { ThoughtCompletionSettings } from '../types';
import { SuggestionStateMachine } from '../state-machine';
import { ghostTextState, hasSuggestion, clearSuggestion } from './ghost-text';
import { createTriggerPlugin } from './triggers';

/**
 * Create the combined CodeMirror extension for thought completion
 */
export function createThoughtCompletionExtension(
  getSettings: () => ThoughtCompletionSettings,
  stateMachine: SuggestionStateMachine
): Extension {
  // Keymap for dismissing suggestions
  const thoughtCompletionKeymap = Prec.highest(
    keymap.of([
      {
        key: 'Escape',
        run: (view: EditorView): boolean => {
          if (hasSuggestion(view)) {
            clearSuggestion(view);
            stateMachine.dismiss();
            return true;
          }
          return false;
        },
      },
    ])
  );

  // Theme for ghost text styling
  const ghostTextTheme = EditorView.baseTheme({
    '.thought-completion-ghost': {
      opacity: '0.5',
      fontStyle: 'italic',
      color: 'var(--text-muted)',
      pointerEvents: 'none',
      userSelect: 'none',
    },
  });

  // Trigger plugin for auto-triggering
  const triggerPlugin = createTriggerPlugin(getSettings, stateMachine);

  return [
    ghostTextState,
    thoughtCompletionKeymap,
    ghostTextTheme,
    triggerPlugin,
  ];
}
