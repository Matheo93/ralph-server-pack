/**
 * Speech-to-Text Service - Convert audio to text using Whisper/Deepgram
 * Multi-language support with confidence scoring and caching
 */

import { z } from 'zod';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const SupportedLanguageSchema = z.enum(['fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'auto']);
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

export const STTProviderSchema = z.enum(['whisper', 'deepgram']);
export type STTProvider = z.infer<typeof STTProviderSchema>;

export const WordTimingSchema = z.object({
  word: z.string(),
  start: z.number(), // seconds
  end: z.number(),
  confidence: z.number().min(0).max(1)
});

export type WordTiming = z.infer<typeof WordTimingSchema>;

export const TranscriptionSegmentSchema = z.object({
  id: z.number(),
  text: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number().min(0).max(1),
  words: z.array(WordTimingSchema).optional()
});

export type TranscriptionSegment = z.infer<typeof TranscriptionSegmentSchema>;

export const TranscriptionResultSchema = z.object({
  id: z.string(),
  audioId: z.string(),
  text: z.string(),
  language: SupportedLanguageSchema,
  detectedLanguage: SupportedLanguageSchema.optional(),
  segments: z.array(TranscriptionSegmentSchema),
  confidence: z.number().min(0).max(1),
  duration: z.number(),
  provider: STTProviderSchema,
  processedAt: z.date(),
  processingTimeMs: z.number()
});

export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;

export const TranscriptionRequestSchema = z.object({
  audioId: z.string(),
  audioUrl: z.string(),
  language: SupportedLanguageSchema.default('auto'),
  enableWordTimings: z.boolean().default(false),
  enableSegments: z.boolean().default(true),
  provider: STTProviderSchema.optional()
});

export type TranscriptionRequest = z.infer<typeof TranscriptionRequestSchema>;

export const TranscriptionErrorSchema = z.object({
  code: z.enum([
    'INVALID_AUDIO',
    'LANGUAGE_NOT_SUPPORTED',
    'PROVIDER_ERROR',
    'TIMEOUT',
    'RATE_LIMITED',
    'NETWORK_ERROR',
    'UNKNOWN'
  ]),
  message: z.string(),
  provider: STTProviderSchema.optional(),
  retryable: z.boolean()
});

export type TranscriptionError = z.infer<typeof TranscriptionErrorSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: 'French',
  en: 'English',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  auto: 'Auto-detect'
};

export const STT_CONFIG = {
  defaultProvider: 'whisper' as STTProvider,
  fallbackProvider: 'deepgram' as STTProvider,
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 60000,
  minConfidenceThreshold: 0.5,
  cacheExpirationMs: 3600000 // 1 hour
} as const;

// ============================================================================
// STT STORE
// ============================================================================

export interface STTStore {
  readonly transcriptions: ReadonlyMap<string, TranscriptionResult>;
  readonly cache: ReadonlyMap<string, { result: TranscriptionResult; expiresAt: Date }>;
  readonly pendingRequests: ReadonlyMap<string, TranscriptionRequest>;
  readonly config: typeof STT_CONFIG;
}

export function createSTTStore(): STTStore {
  return {
    transcriptions: new Map(),
    cache: new Map(),
    pendingRequests: new Map(),
    config: STT_CONFIG
  };
}

// ============================================================================
// WHISPER API INTEGRATION (MOCK - REAL IMPLEMENTATION WOULD CALL OPENAI API)
// ============================================================================

export interface WhisperConfig {
  apiKey: string;
  model: 'whisper-1';
  responseFormat: 'json' | 'verbose_json';
}

export function createWhisperRequest(
  audioUrl: string,
  language: SupportedLanguage,
  enableWordTimings: boolean
): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
} {
  return {
    url: 'https://api.openai.com/v1/audio/transcriptions',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${OPENAI_API_KEY}',
      'Content-Type': 'multipart/form-data'
    },
    body: {
      model: 'whisper-1',
      language: language === 'auto' ? undefined : language,
      response_format: enableWordTimings ? 'verbose_json' : 'json',
      timestamp_granularities: enableWordTimings ? ['word', 'segment'] : ['segment']
    }
  };
}

export function parseWhisperResponse(response: {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    text: string;
    start: number;
    end: number;
    avg_logprob?: number;
    words?: Array<{ word: string; start: number; end: number; probability?: number }>;
  }>;
}): {
  text: string;
  detectedLanguage: SupportedLanguage | undefined;
  segments: TranscriptionSegment[];
  confidence: number;
  duration: number;
} {
  const segments: TranscriptionSegment[] = (response.segments ?? []).map(seg => ({
    id: seg.id,
    text: seg.text.trim(),
    start: seg.start,
    end: seg.end,
    confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.85,
    words: seg.words?.map(w => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.probability ?? 0.85
    }))
  }));

  const avgConfidence = segments.length > 0
    ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
    : 0.85;

  const detectedLanguage = response.language
    ? (SupportedLanguageSchema.options.includes(response.language as SupportedLanguage)
      ? response.language as SupportedLanguage
      : undefined)
    : undefined;

  return {
    text: response.text.trim(),
    detectedLanguage,
    segments,
    confidence: avgConfidence,
    duration: response.duration ?? 0
  };
}

// ============================================================================
// DEEPGRAM API INTEGRATION (MOCK - REAL IMPLEMENTATION WOULD CALL DEEPGRAM API)
// ============================================================================

export interface DeepgramConfig {
  apiKey: string;
  model: 'nova-2' | 'enhanced';
  tier: 'enhanced' | 'base';
}

export function createDeepgramRequest(
  audioUrl: string,
  language: SupportedLanguage,
  enableWordTimings: boolean
): {
  url: string;
  method: string;
  headers: Record<string, string>;
  params: Record<string, string>;
} {
  const languageCode = language === 'auto' ? '' : language;

  return {
    url: 'https://api.deepgram.com/v1/listen',
    method: 'POST',
    headers: {
      'Authorization': 'Token ${DEEPGRAM_API_KEY}',
      'Content-Type': 'application/json'
    },
    params: {
      model: 'nova-2',
      language: languageCode,
      punctuate: 'true',
      utterances: 'true',
      diarize: 'false',
      smart_format: 'true',
      ...(enableWordTimings ? { words: 'true' } : {})
    }
  };
}

export function parseDeepgramResponse(response: {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript: string;
        confidence: number;
        words?: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
        }>;
      }>;
    }>;
    utterances?: Array<{
      id: string;
      transcript: string;
      start: number;
      end: number;
      confidence: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>;
  };
  metadata?: {
    duration: number;
    language?: string;
  };
}): {
  text: string;
  detectedLanguage: SupportedLanguage | undefined;
  segments: TranscriptionSegment[];
  confidence: number;
  duration: number;
} {
  const channel = response.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  const segments: TranscriptionSegment[] = (response.results?.utterances ?? []).map((utt, index) => ({
    id: index,
    text: utt.transcript.trim(),
    start: utt.start,
    end: utt.end,
    confidence: utt.confidence,
    words: utt.words?.map(w => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence
    }))
  }));

  const detectedLanguage = response.metadata?.language
    ? (SupportedLanguageSchema.options.includes(response.metadata.language as SupportedLanguage)
      ? response.metadata.language as SupportedLanguage
      : undefined)
    : undefined;

  return {
    text: alternative?.transcript?.trim() ?? '',
    detectedLanguage,
    segments,
    confidence: alternative?.confidence ?? 0.85,
    duration: response.metadata?.duration ?? 0
  };
}

// ============================================================================
// TRANSCRIPTION OPERATIONS
// ============================================================================

export function startTranscription(
  store: STTStore,
  request: TranscriptionRequest
): STTStore {
  return {
    ...store,
    pendingRequests: new Map(store.pendingRequests).set(request.audioId, request)
  };
}

export function completeTranscription(
  store: STTStore,
  result: TranscriptionResult
): STTStore {
  const newPending = new Map(store.pendingRequests);
  newPending.delete(result.audioId);

  // Add to cache
  const cacheEntry = {
    result,
    expiresAt: new Date(Date.now() + store.config.cacheExpirationMs)
  };

  return {
    ...store,
    transcriptions: new Map(store.transcriptions).set(result.id, result),
    cache: new Map(store.cache).set(result.audioId, cacheEntry),
    pendingRequests: newPending
  };
}

export function getTranscription(
  store: STTStore,
  transcriptionId: string
): TranscriptionResult | undefined {
  return store.transcriptions.get(transcriptionId);
}

export function getTranscriptionByAudioId(
  store: STTStore,
  audioId: string
): TranscriptionResult | undefined {
  // Check cache first
  const cached = store.cache.get(audioId);
  if (cached && cached.expiresAt > new Date()) {
    return cached.result;
  }

  // Search transcriptions
  for (const result of store.transcriptions.values()) {
    if (result.audioId === audioId) {
      return result;
    }
  }

  return undefined;
}

export function isPending(store: STTStore, audioId: string): boolean {
  return store.pendingRequests.has(audioId);
}

// ============================================================================
// CONFIDENCE & QUALITY ASSESSMENT
// ============================================================================

export interface TranscriptionQuality {
  overall: 'high' | 'medium' | 'low';
  confidenceScore: number;
  issues: string[];
  suggestions: string[];
}

export function assessTranscriptionQuality(result: TranscriptionResult): TranscriptionQuality {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Overall confidence assessment
  let qualityLevel: 'high' | 'medium' | 'low';
  if (result.confidence >= 0.85) {
    qualityLevel = 'high';
  } else if (result.confidence >= 0.6) {
    qualityLevel = 'medium';
  } else {
    qualityLevel = 'low';
  }

  // Check for low-confidence segments
  const lowConfidenceSegments = result.segments.filter(s => s.confidence < 0.6);
  if (lowConfidenceSegments.length > 0) {
    issues.push(`${lowConfidenceSegments.length} segment(s) with low confidence`);
    suggestions.push('Consider re-recording in a quieter environment');
  }

  // Check text length
  if (result.text.length < 10) {
    issues.push('Very short transcription');
    suggestions.push('Speak clearly and for at least a few seconds');
  }

  // Check for empty segments
  const emptySegments = result.segments.filter(s => s.text.trim().length === 0);
  if (emptySegments.length > 0) {
    issues.push('Some segments could not be transcribed');
  }

  // Audio quality indicators
  if (result.duration < 1) {
    issues.push('Audio too short for accurate transcription');
    suggestions.push('Record for at least 2 seconds');
  }

  return {
    overall: qualityLevel,
    confidenceScore: result.confidence,
    issues,
    suggestions
  };
}

export function isTranscriptionReliable(result: TranscriptionResult): boolean {
  const quality = assessTranscriptionQuality(result);
  return quality.overall !== 'low' && result.confidence >= STT_CONFIG.minConfidenceThreshold;
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

export function normalizeLanguage(language: string): SupportedLanguage {
  const normalized = language.toLowerCase().substring(0, 2);

  if (SupportedLanguageSchema.options.includes(normalized as SupportedLanguage)) {
    return normalized as SupportedLanguage;
  }

  return 'auto';
}

export function getLanguageFromResult(result: TranscriptionResult): SupportedLanguage {
  return result.detectedLanguage ?? result.language;
}

// ============================================================================
// TEXT POST-PROCESSING
// ============================================================================

export function cleanTranscriptionText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s+([.,!?;:])/g, '$1') // Remove space before punctuation
    .replace(/([.,!?;:])([^\s])/g, '$1 $2') // Add space after punctuation
    .replace(/^\s*[.,!?;:]+\s*/g, '') // Remove leading punctuation
    .replace(/\s*[.,!?;:]+\s*$/g, '.'); // Clean trailing punctuation
}

export function capitalizeFirstLetter(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTranscriptionText(text: string, language: SupportedLanguage): string {
  let formatted = cleanTranscriptionText(text);
  formatted = capitalizeFirstLetter(formatted);

  // Language-specific formatting
  if (language === 'fr') {
    // French: space before certain punctuation
    formatted = formatted.replace(/\s*([?!;:])/g, ' $1');
  }

  return formatted;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export function cleanExpiredCache(store: STTStore): STTStore {
  const now = new Date();
  const validCache = new Map<string, { result: TranscriptionResult; expiresAt: Date }>();

  for (const [key, entry] of store.cache) {
    if (entry.expiresAt > now) {
      validCache.set(key, entry);
    }
  }

  return { ...store, cache: validCache };
}

export function getCacheStats(store: STTStore): {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
} {
  const now = new Date();
  let validCount = 0;
  let expiredCount = 0;

  for (const entry of store.cache.values()) {
    if (entry.expiresAt > now) {
      validCount++;
    } else {
      expiredCount++;
    }
  }

  return {
    totalEntries: store.cache.size,
    validEntries: validCount,
    expiredEntries: expiredCount
  };
}

// ============================================================================
// MOCK TRANSCRIPTION (FOR TESTING)
// ============================================================================

export function createMockTranscription(
  audioId: string,
  text: string,
  language: SupportedLanguage = 'fr',
  provider: STTProvider = 'whisper'
): TranscriptionResult {
  const words = text.split(' ');
  const duration = words.length * 0.5; // Rough estimate

  const segments: TranscriptionSegment[] = [{
    id: 0,
    text: text,
    start: 0,
    end: duration,
    confidence: 0.92,
    words: words.map((word, i) => ({
      word,
      start: i * 0.5,
      end: (i + 1) * 0.5,
      confidence: 0.9 + Math.random() * 0.1
    }))
  }];

  return {
    id: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    audioId,
    text,
    language,
    detectedLanguage: language,
    segments,
    confidence: 0.92,
    duration,
    provider,
    processedAt: new Date(),
    processingTimeMs: 1500
  };
}

// ============================================================================
// STT STATS
// ============================================================================

export function getSTTStats(store: STTStore): {
  totalTranscriptions: number;
  pendingRequests: number;
  avgConfidence: number;
  byProvider: Record<STTProvider, number>;
  byLanguage: Record<SupportedLanguage, number>;
} {
  const transcriptions = Array.from(store.transcriptions.values());

  const byProvider: Record<STTProvider, number> = { whisper: 0, deepgram: 0 };
  const byLanguage: Record<SupportedLanguage, number> = {
    fr: 0, en: 0, es: 0, de: 0, it: 0, pt: 0, nl: 0, auto: 0
  };

  let totalConfidence = 0;

  for (const t of transcriptions) {
    byProvider[t.provider]++;
    const lang = t.detectedLanguage ?? t.language;
    byLanguage[lang]++;
    totalConfidence += t.confidence;
  }

  return {
    totalTranscriptions: transcriptions.length,
    pendingRequests: store.pendingRequests.size,
    avgConfidence: transcriptions.length > 0 ? totalConfidence / transcriptions.length : 0,
    byProvider,
    byLanguage
  };
}
