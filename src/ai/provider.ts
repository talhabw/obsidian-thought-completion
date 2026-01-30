import { CompletionContext, ThoughtCompletionSettings, SuggestionCase } from '../types';
import { getSystemPrompt, buildUserPrompt } from './prompts';

// Debug flag for API requests/responses - disable for production
const DEBUG_API = false;

function debugApi(...args: unknown[]): void {
  if (DEBUG_API) {
    console.log('[ThoughtCompletion:API]', ...args);
  }
}

/**
 * OpenAI-compatible API provider for generating suggestions
 */
export class AIProvider {
  private abortController: AbortController | null = null;

  constructor(private settings: ThoughtCompletionSettings) {}

  /**
   * Update settings reference (called when settings change)
   */
  updateSettings(settings: ThoughtCompletionSettings): void {
    this.settings = settings;
  }

  /**
   * Generate a thinking suggestion based on context
   */
  async complete(context: CompletionContext): Promise<string | null> {
    // Abort any in-flight request
    this.abort();

    if (!this.settings.apiKey || !this.settings.apiEndpoint) {
      console.warn('Thought Completion: API key or endpoint not configured');
      return null;
    }

    this.abortController = new AbortController();

    try {
      const systemPrompt = getSystemPrompt(context.mode);
      const userPrompt = buildUserPrompt(
        context.prefix,
        context.suffix,
        context.headingTrail
      );

      const requestBody = {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
      };

      const url = `${this.settings.apiEndpoint}/chat/completions`;
      
      debugApi('Request URL:', url);
      debugApi('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal,
      });

      debugApi('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        debugApi('Response error:', errorText);
        console.error('Thought Completion API error:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      debugApi('Response data:', JSON.stringify(data, null, 2));

      const suggestion = data.choices?.[0]?.message?.content?.trim();
      debugApi('Extracted suggestion:', suggestion || '(empty)');

      if (!suggestion) {
        debugApi('No suggestion found in response');
        return null;
      }

      // Clean up the suggestion (remove quotes if wrapped)
      const cleaned = cleanSuggestion(suggestion);
      debugApi('Cleaned suggestion:', cleaned);
      
      // Apply case transformation
      const transformed = transformCase(cleaned, this.settings.suggestionCase);
      debugApi('Transformed suggestion:', transformed);
      return transformed;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        debugApi('Request aborted');
        // Request was cancelled, this is expected
        return null;
      }
      debugApi('Request error:', error);
      console.error('Thought Completion error:', error);
      return null;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Abort any in-flight request
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

/**
 * Clean up the AI suggestion
 */
function cleanSuggestion(suggestion: string): string {
  let cleaned = suggestion;

  // Remove surrounding quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove common prefixes the AI might add
  const prefixes = [
    'Suggestion: ',
    'Consider: ',
    'Think about: ',
    'Question: ',
    'Try: ',
  ];
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }

  return cleaned.trim();
}

/**
 * Apply case transformation to the suggestion
 */
function transformCase(text: string, caseType: SuggestionCase): string {
  if (!text || caseType === 'none') {
    return text;
  }

  if (caseType === 'lower') {
    return text.toLowerCase();
  }

  if (caseType === 'firstLower') {
    // Only lowercase first letter if:
    // 1. Text has at least 1 character
    // 2. Either it's a single character word, OR the second letter is also lowercase
    //    (to avoid lowercasing acronyms like "AI" or proper nouns like "JavaScript")
    if (text.length === 0) {
      return text;
    }
    
    const firstChar = text[0];
    const secondChar = text[1];
    
    // If it's a single char, or second char is lowercase/non-letter, lowercase the first
    if (text.length === 1 || !secondChar || secondChar === secondChar.toLowerCase()) {
      return firstChar.toLowerCase() + text.slice(1);
    }
    
    // Second char is uppercase (likely acronym or proper noun), keep as-is
    return text;
  }

  return text;
}
