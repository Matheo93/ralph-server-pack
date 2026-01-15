/**
 * Audio Processor - Validate and process audio files for voice-to-task
 * Handles format validation, duration limits, and audio normalization
 */

import { z } from 'zod';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const AudioFormatSchema = z.enum(['wav', 'mp3', 'm4a', 'webm', 'ogg', 'flac']);
export type AudioFormat = z.infer<typeof AudioFormatSchema>;

export const AudioMetadataSchema = z.object({
  format: AudioFormatSchema,
  duration: z.number().min(0), // seconds
  sampleRate: z.number().min(0),
  channels: z.number().min(1).max(2),
  bitRate: z.number().min(0).optional(),
  fileSize: z.number().min(0), // bytes
  codec: z.string().optional()
});

export type AudioMetadata = z.infer<typeof AudioMetadataSchema>;

export const AudioChunkSchema = z.object({
  id: z.string(),
  index: z.number().min(0),
  totalChunks: z.number().min(1),
  data: z.instanceof(Uint8Array),
  size: z.number().min(0),
  uploadedAt: z.date()
});

export type AudioChunk = z.infer<typeof AudioChunkSchema>;

export const AudioUploadStateSchema = z.object({
  uploadId: z.string(),
  userId: z.string(),
  filename: z.string(),
  totalSize: z.number().min(0),
  uploadedSize: z.number().min(0),
  chunks: z.array(AudioChunkSchema),
  status: z.enum(['pending', 'uploading', 'complete', 'failed']),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  error: z.string().optional()
});

export type AudioUploadState = z.infer<typeof AudioUploadStateSchema>;

export const ProcessedAudioSchema = z.object({
  id: z.string(),
  originalFilename: z.string(),
  format: AudioFormatSchema,
  metadata: AudioMetadataSchema,
  normalizedUrl: z.string().optional(),
  rawUrl: z.string(),
  processedAt: z.date(),
  userId: z.string(),
  householdId: z.string().optional()
});

export type ProcessedAudio = z.infer<typeof ProcessedAudioSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  metadata: AudioMetadataSchema.optional()
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

export const AUDIO_CONFIG = {
  maxDuration: 30, // seconds
  minDuration: 0.5, // seconds
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxChunkSize: 1 * 1024 * 1024, // 1MB per chunk
  supportedFormats: ['wav', 'mp3', 'm4a', 'webm', 'ogg', 'flac'] as AudioFormat[],
  targetSampleRate: 16000, // Hz for STT optimization
  targetChannels: 1, // mono for STT
  uploadTimeout: 60000 // 60 seconds
} as const;

export const MIME_TYPE_MAP: Record<AudioFormat, string[]> = {
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
  mp3: ['audio/mpeg', 'audio/mp3'],
  m4a: ['audio/m4a', 'audio/mp4', 'audio/x-m4a'],
  webm: ['audio/webm'],
  ogg: ['audio/ogg', 'audio/vorbis'],
  flac: ['audio/flac', 'audio/x-flac']
};

// ============================================================================
// AUDIO PROCESSOR STORE
// ============================================================================

export interface AudioProcessorStore {
  readonly uploads: ReadonlyMap<string, AudioUploadState>;
  readonly processedAudios: ReadonlyMap<string, ProcessedAudio>;
  readonly config: typeof AUDIO_CONFIG;
}

export function createAudioProcessorStore(): AudioProcessorStore {
  return {
    uploads: new Map(),
    processedAudios: new Map(),
    config: AUDIO_CONFIG
  };
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

export function detectFormatFromMimeType(mimeType: string): AudioFormat | null {
  const normalizedMime = mimeType.toLowerCase().trim();

  for (const [format, mimeTypes] of Object.entries(MIME_TYPE_MAP)) {
    if (mimeTypes.some(m => normalizedMime.includes(m) || m.includes(normalizedMime))) {
      return format as AudioFormat;
    }
  }

  return null;
}

export function detectFormatFromExtension(filename: string): AudioFormat | null {
  const extension = filename.split('.').pop()?.toLowerCase();

  if (extension && AUDIO_CONFIG.supportedFormats.includes(extension as AudioFormat)) {
    return extension as AudioFormat;
  }

  return null;
}

export function detectFormat(
  filename: string,
  mimeType?: string
): AudioFormat | null {
  // Try MIME type first (more reliable)
  if (mimeType) {
    const fromMime = detectFormatFromMimeType(mimeType);
    if (fromMime) return fromMime;
  }

  // Fall back to extension
  return detectFormatFromExtension(filename);
}

// ============================================================================
// AUDIO VALIDATION
// ============================================================================

export function validateAudioFormat(
  filename: string,
  mimeType?: string
): { valid: boolean; format: AudioFormat | null; error?: string } {
  const format = detectFormat(filename, mimeType);

  if (!format) {
    return {
      valid: false,
      format: null,
      error: `Unsupported audio format. Supported formats: ${AUDIO_CONFIG.supportedFormats.join(', ')}`
    };
  }

  return { valid: true, format };
}

export function validateAudioSize(fileSize: number): { valid: boolean; error?: string } {
  if (fileSize <= 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (fileSize > AUDIO_CONFIG.maxFileSize) {
    const maxMB = AUDIO_CONFIG.maxFileSize / (1024 * 1024);
    return { valid: false, error: `File size exceeds ${maxMB}MB limit` };
  }

  return { valid: true };
}

export function validateAudioDuration(duration: number): { valid: boolean; error?: string } {
  if (duration < AUDIO_CONFIG.minDuration) {
    return { valid: false, error: `Audio must be at least ${AUDIO_CONFIG.minDuration} seconds` };
  }

  if (duration > AUDIO_CONFIG.maxDuration) {
    return { valid: false, error: `Audio must be ${AUDIO_CONFIG.maxDuration} seconds or less` };
  }

  return { valid: true };
}

export function validateAudio(
  filename: string,
  fileSize: number,
  duration: number,
  mimeType?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate format
  const formatResult = validateAudioFormat(filename, mimeType);
  if (!formatResult.valid) {
    errors.push(formatResult.error!);
  }

  // Validate size
  const sizeResult = validateAudioSize(fileSize);
  if (!sizeResult.valid) {
    errors.push(sizeResult.error!);
  }

  // Validate duration
  const durationResult = validateAudioDuration(duration);
  if (!durationResult.valid) {
    errors.push(durationResult.error!);
  }

  // Add warnings
  if (duration > AUDIO_CONFIG.maxDuration * 0.8) {
    warnings.push('Audio is close to maximum duration limit');
  }

  if (fileSize > AUDIO_CONFIG.maxFileSize * 0.8) {
    warnings.push('File size is close to maximum limit');
  }

  const metadata: AudioMetadata | undefined = formatResult.format ? {
    format: formatResult.format,
    duration,
    sampleRate: AUDIO_CONFIG.targetSampleRate,
    channels: AUDIO_CONFIG.targetChannels,
    fileSize
  } : undefined;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata
  };
}

// ============================================================================
// CHUNKED UPLOAD MANAGEMENT
// ============================================================================

export function initializeUpload(
  store: AudioProcessorStore,
  uploadId: string,
  userId: string,
  filename: string,
  totalSize: number
): AudioProcessorStore {
  const uploadState: AudioUploadState = {
    uploadId,
    userId,
    filename,
    totalSize,
    uploadedSize: 0,
    chunks: [],
    status: 'pending',
    startedAt: new Date()
  };

  return {
    ...store,
    uploads: new Map(store.uploads).set(uploadId, uploadState)
  };
}

export function addChunk(
  store: AudioProcessorStore,
  uploadId: string,
  chunk: Omit<AudioChunk, 'uploadedAt'>
): AudioProcessorStore {
  const upload = store.uploads.get(uploadId);
  if (!upload) {
    return store;
  }

  const newChunk: AudioChunk = {
    ...chunk,
    uploadedAt: new Date()
  };

  const updatedChunks = [...upload.chunks, newChunk].sort((a, b) => a.index - b.index);
  const uploadedSize = updatedChunks.reduce((sum, c) => sum + c.size, 0);
  const isComplete = uploadedSize >= upload.totalSize;

  const updatedUpload: AudioUploadState = {
    ...upload,
    chunks: updatedChunks,
    uploadedSize,
    status: isComplete ? 'complete' : 'uploading',
    completedAt: isComplete ? new Date() : undefined
  };

  return {
    ...store,
    uploads: new Map(store.uploads).set(uploadId, updatedUpload)
  };
}

export function getUploadStatus(
  store: AudioProcessorStore,
  uploadId: string
): AudioUploadState | undefined {
  return store.uploads.get(uploadId);
}

export function assembleChunks(
  store: AudioProcessorStore,
  uploadId: string
): Uint8Array | null {
  const upload = store.uploads.get(uploadId);
  if (!upload || upload.status !== 'complete') {
    return null;
  }

  const sortedChunks = [...upload.chunks].sort((a, b) => a.index - b.index);
  const totalLength = sortedChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of sortedChunks) {
    result.set(chunk.data, offset);
    offset += chunk.data.length;
  }

  return result;
}

export function cancelUpload(
  store: AudioProcessorStore,
  uploadId: string,
  error?: string
): AudioProcessorStore {
  const upload = store.uploads.get(uploadId);
  if (!upload) {
    return store;
  }

  const updatedUpload: AudioUploadState = {
    ...upload,
    status: 'failed',
    error: error ?? 'Upload cancelled',
    completedAt: new Date()
  };

  return {
    ...store,
    uploads: new Map(store.uploads).set(uploadId, updatedUpload)
  };
}

export function cleanupOldUploads(
  store: AudioProcessorStore,
  maxAgeMs: number = 3600000 // 1 hour
): AudioProcessorStore {
  const now = Date.now();
  const updatedUploads = new Map<string, AudioUploadState>();

  for (const [id, upload] of store.uploads) {
    const age = now - upload.startedAt.getTime();
    if (age < maxAgeMs || upload.status === 'complete') {
      updatedUploads.set(id, upload);
    }
  }

  return { ...store, uploads: updatedUploads };
}

// ============================================================================
// AUDIO NORMALIZATION (METADATA ONLY - ACTUAL PROCESSING WOULD USE FFMPEG)
// ============================================================================

export interface NormalizationConfig {
  targetSampleRate: number;
  targetChannels: number;
  targetFormat: AudioFormat;
  normalizeVolume: boolean;
}

export const DEFAULT_NORMALIZATION_CONFIG: NormalizationConfig = {
  targetSampleRate: 16000,
  targetChannels: 1,
  targetFormat: 'wav',
  normalizeVolume: true
};

export function createNormalizationPlan(
  metadata: AudioMetadata,
  config: NormalizationConfig = DEFAULT_NORMALIZATION_CONFIG
): {
  needsResampling: boolean;
  needsChannelConversion: boolean;
  needsFormatConversion: boolean;
  needsVolumeNormalization: boolean;
  operations: string[];
} {
  const operations: string[] = [];

  const needsResampling = metadata.sampleRate !== config.targetSampleRate;
  const needsChannelConversion = metadata.channels !== config.targetChannels;
  const needsFormatConversion = metadata.format !== config.targetFormat;
  const needsVolumeNormalization = config.normalizeVolume;

  if (needsFormatConversion) {
    operations.push(`Convert from ${metadata.format} to ${config.targetFormat}`);
  }

  if (needsResampling) {
    operations.push(`Resample from ${metadata.sampleRate}Hz to ${config.targetSampleRate}Hz`);
  }

  if (needsChannelConversion) {
    operations.push(`Convert from ${metadata.channels} channels to ${config.targetChannels} channel(s)`);
  }

  if (needsVolumeNormalization) {
    operations.push('Normalize audio volume');
  }

  return {
    needsResampling,
    needsChannelConversion,
    needsFormatConversion,
    needsVolumeNormalization,
    operations
  };
}

// Note: Actual audio processing would require FFmpeg or similar
// This is a metadata-only implementation
export function estimateProcessingTime(
  metadata: AudioMetadata,
  config: NormalizationConfig = DEFAULT_NORMALIZATION_CONFIG
): number {
  const plan = createNormalizationPlan(metadata, config);
  let baseTime = metadata.duration * 0.1; // Base: 0.1x real-time

  if (plan.needsResampling) baseTime += metadata.duration * 0.05;
  if (plan.needsChannelConversion) baseTime += metadata.duration * 0.02;
  if (plan.needsFormatConversion) baseTime += metadata.duration * 0.05;
  if (plan.needsVolumeNormalization) baseTime += metadata.duration * 0.03;

  return Math.ceil(baseTime * 1000); // Return milliseconds
}

// ============================================================================
// PROCESSED AUDIO MANAGEMENT
// ============================================================================

export function storeProcessedAudio(
  store: AudioProcessorStore,
  audio: ProcessedAudio
): AudioProcessorStore {
  return {
    ...store,
    processedAudios: new Map(store.processedAudios).set(audio.id, audio)
  };
}

export function getProcessedAudio(
  store: AudioProcessorStore,
  audioId: string
): ProcessedAudio | undefined {
  return store.processedAudios.get(audioId);
}

export function deleteProcessedAudio(
  store: AudioProcessorStore,
  audioId: string
): AudioProcessorStore {
  const newMap = new Map(store.processedAudios);
  newMap.delete(audioId);
  return { ...store, processedAudios: newMap };
}

export function getProcessedAudiosByUser(
  store: AudioProcessorStore,
  userId: string
): readonly ProcessedAudio[] {
  return Array.from(store.processedAudios.values())
    .filter(a => a.userId === userId)
    .sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime());
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateAudioId(): string {
  return `audio_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function calculateChunkCount(totalSize: number, chunkSize: number = AUDIO_CONFIG.maxChunkSize): number {
  return Math.ceil(totalSize / chunkSize);
}

export function getMissingChunks(
  store: AudioProcessorStore,
  uploadId: string
): number[] {
  const upload = store.uploads.get(uploadId);
  if (!upload) return [];

  const totalChunks = calculateChunkCount(upload.totalSize);
  const uploadedIndices = new Set(upload.chunks.map(c => c.index));
  const missing: number[] = [];

  for (let i = 0; i < totalChunks; i++) {
    if (!uploadedIndices.has(i)) {
      missing.push(i);
    }
  }

  return missing;
}

// ============================================================================
// AUDIO PROCESSOR SUMMARY
// ============================================================================

export function getAudioProcessorStats(store: AudioProcessorStore): {
  totalUploads: number;
  pendingUploads: number;
  completedUploads: number;
  failedUploads: number;
  totalProcessedAudios: number;
  totalStorageBytes: number;
} {
  const uploads = Array.from(store.uploads.values());
  const processedAudios = Array.from(store.processedAudios.values());

  return {
    totalUploads: uploads.length,
    pendingUploads: uploads.filter(u => u.status === 'pending' || u.status === 'uploading').length,
    completedUploads: uploads.filter(u => u.status === 'complete').length,
    failedUploads: uploads.filter(u => u.status === 'failed').length,
    totalProcessedAudios: processedAudios.length,
    totalStorageBytes: processedAudios.reduce((sum, a) => sum + a.metadata.fileSize, 0)
  };
}
