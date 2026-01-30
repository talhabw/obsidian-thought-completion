import { EditorView } from '@codemirror/view';
import { CompletionContext } from '../types';

/**
 * Extract context from the editor for AI completion
 */
export function extractContext(
  view: EditorView,
  contextChars: number,
  includeHeadingTrail: boolean
): Omit<CompletionContext, 'mode'> {
  const state = view.state;
  const cursorPosition = state.selection.main.head;
  const doc = state.doc.toString();

  // Extract prefix (text before cursor)
  const prefixStart = Math.max(0, cursorPosition - contextChars);
  let prefix = doc.slice(prefixStart, cursorPosition);
  
  // If we truncated, try to start at a reasonable boundary (newline)
  if (prefixStart > 0) {
    const firstNewline = prefix.indexOf('\n');
    if (firstNewline > 0 && firstNewline < 100) {
      prefix = prefix.slice(firstNewline + 1);
    }
  }

  // Extract suffix (text after cursor)
  const suffixEnd = Math.min(doc.length, cursorPosition + Math.floor(contextChars / 3));
  let suffix = doc.slice(cursorPosition, suffixEnd);
  
  // Truncate at a reasonable boundary
  if (suffixEnd < doc.length) {
    const lastNewline = suffix.lastIndexOf('\n');
    if (lastNewline > 0) {
      suffix = suffix.slice(0, lastNewline);
    }
  }

  // Extract heading trail
  let headingTrail = '';
  if (includeHeadingTrail) {
    headingTrail = extractHeadingTrail(doc, cursorPosition);
  }

  return {
    prefix,
    suffix,
    headingTrail,
    cursorPosition,
  };
}

/**
 * Extract the current heading hierarchy (e.g., "# Main > ## Section > ### Subsection")
 */
function extractHeadingTrail(doc: string, cursorPosition: number): string {
  const textBefore = doc.slice(0, cursorPosition);
  const lines = textBefore.split('\n');
  
  const headings: { level: number; text: string }[] = [];
  
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      
      // Remove headings that are at a deeper or equal level
      while (headings.length > 0 && headings[headings.length - 1].level >= level) {
        headings.pop();
      }
      
      headings.push({ level, text });
    }
  }
  
  if (headings.length === 0) {
    return '';
  }
  
  return headings.map(h => h.text).join(' > ');
}

/**
 * Check if the cursor is in a code block (to skip suggestions)
 */
export function isInCodeBlock(doc: string, cursorPosition: number): boolean {
  const textBefore = doc.slice(0, cursorPosition);
  
  // Count opening and closing code fences
  const openFences = (textBefore.match(/^```/gm) || []).length;
  
  // If odd number of fences, we're inside a code block
  return openFences % 2 === 1;
}

/**
 * Check if the cursor is in frontmatter (YAML block at start)
 */
export function isInFrontmatter(doc: string, cursorPosition: number): boolean {
  if (!doc.startsWith('---\n')) {
    return false;
  }
  
  const endOfFrontmatter = doc.indexOf('\n---\n', 4);
  if (endOfFrontmatter === -1) {
    // Frontmatter not closed, cursor might be inside
    return cursorPosition < doc.indexOf('\n', 4) + 100; // Rough heuristic
  }
  
  return cursorPosition <= endOfFrontmatter + 4;
}
