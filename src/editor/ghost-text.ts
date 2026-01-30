import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import {
  StateField,
  StateEffect,
  Transaction,
} from '@codemirror/state';

/**
 * Ghost text widget that renders the suggestion
 */
export class GhostTextWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'thought-completion-ghost';
    span.textContent = this.text;
    return span;
  }

  eq(other: GhostTextWidget): boolean {
    return this.text === other.text;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

/**
 * State effect to set or clear the ghost text suggestion
 */
export const setSuggestionEffect = StateEffect.define<{
  text: string;
  position: number;
} | null>();

/**
 * State for tracking the current suggestion
 */
interface GhostTextState {
  decorations: DecorationSet;
  suggestion: { text: string; position: number } | null;
}

/**
 * StateField that manages the ghost text decoration
 */
export const ghostTextState = StateField.define<GhostTextState>({
  create(): GhostTextState {
    return {
      decorations: Decoration.none,
      suggestion: null,
    };
  },

  update(state: GhostTextState, tr: Transaction): GhostTextState {
    let { suggestion } = state;

    // Handle our effect
    for (const effect of tr.effects) {
      if (effect.is(setSuggestionEffect)) {
        suggestion = effect.value;
      }
    }

    // Clear on document changes (user is typing)
    if (tr.docChanged) {
      suggestion = null;
    }

    // Clear if cursor moved away from suggestion position
    if (suggestion && tr.selection) {
      const cursorPos = tr.state.selection.main.head;
      if (cursorPos !== suggestion.position) {
        suggestion = null;
      }
    }

    // Build decorations
    let decorations = Decoration.none;
    if (suggestion) {
      try {
        decorations = Decoration.set([
          Decoration.widget({
            widget: new GhostTextWidget(suggestion.text),
            side: 1, // After cursor
          }).range(suggestion.position),
        ]);
      } catch {
        // Position might be invalid after doc changes
        suggestion = null;
      }
    }

    return { decorations, suggestion };
  },

  provide: (field) =>
    EditorView.decorations.from(field, (state) => state.decorations),
});

/**
 * Get the current suggestion from the editor state
 */
export function getCurrentSuggestion(
  view: EditorView
): { text: string; position: number } | null {
  return view.state.field(ghostTextState).suggestion;
}

/**
 * Show a ghost text suggestion at the current cursor position
 */
export function showSuggestion(view: EditorView, text: string): void {
  const position = view.state.selection.main.head;
  view.dispatch({
    effects: setSuggestionEffect.of({ text, position }),
  });
}

/**
 * Clear the current ghost text suggestion
 */
export function clearSuggestion(view: EditorView): void {
  view.dispatch({
    effects: setSuggestionEffect.of(null),
  });
}

/**
 * Check if there's an active suggestion
 */
export function hasSuggestion(view: EditorView): boolean {
  return getCurrentSuggestion(view) !== null;
}
