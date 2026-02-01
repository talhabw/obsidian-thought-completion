/**
 * Shared types for the Thought Completion plugin
 */

/**
 * Suggestion modes - determines the type of thinking nudge
 */
export type SuggestionMode = 
  | 'auto'       // AI picks the best mode
  | 'questions'  // Thought-provoking questions
  | 'structural' // Organizational suggestions
  | 'critical'   // Counterpoints and challenges
  | 'connector'; // Links and connections

/**
 * State machine states for suggestion lifecycle
 */
export type SuggestionState = 
  | 'idle'       // Waiting for trigger
  | 'queued'     // Trigger detected, waiting for delay
  | 'predicting' // API call in progress
  | 'suggesting' // Showing ghost text
  | 'disabled';  // Plugin disabled

/**
 * Suggestion case transformation options
 */
export type SuggestionCase =
  | 'none'        // Keep as-is from AI
  | 'lower'       // All lowercase
  | 'firstLower'; // First letter lowercase (if not acronym)

/**
 * Custom prompts per mode (empty string means use default)
 */
export type CustomPrompts = Partial<Record<SuggestionMode, string>>;

/**
 * Plugin settings
 */
export interface ThoughtCompletionSettings {
  // API Configuration
  apiEndpoint: string;
  apiKey: string;
  model: string;
  
  // Suggestion Mode
  mode: SuggestionMode;
  
  // Trigger Settings
  triggerDelay: number;           // ms to wait before API call
  triggerOnPunctuation: boolean;
  triggerOnNewline: boolean;
  manualTriggerOnly: boolean;
  
  // Context Settings
  contextChars: number;           // chars of surrounding context
  includeHeadingTrail: boolean;
  
  // Model Parameters
  maxTokens: number;
  temperature: number;
  
  // UI
  enabled: boolean;
  suggestionCase: SuggestionCase;
  showStatusBar: boolean;
  
  // Custom Prompts
  customPrompts: CustomPrompts;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: ThoughtCompletionSettings = {
  apiEndpoint: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  mode: 'auto',
  triggerDelay: 2000,
  triggerOnPunctuation: true,
  triggerOnNewline: true,
  manualTriggerOnly: false,
  contextChars: 1500,
  includeHeadingTrail: true,
  maxTokens: 500,  // Higher default for reasoning models
  temperature: 0.7,
  enabled: true,
  suggestionCase: 'none',
  showStatusBar: false,
  customPrompts: {},
};

/**
 * Context passed to AI for generating suggestions
 */
export interface CompletionContext {
  prefix: string;        // Text before cursor
  suffix: string;        // Text after cursor
  headingTrail: string;  // Current heading hierarchy
  mode: SuggestionMode;
  cursorPosition: number;
}

/**
 * Current suggestion state
 */
export interface SuggestionData {
  text: string;
  position: number;
  timestamp: number;
}
