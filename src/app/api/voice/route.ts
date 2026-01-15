/**
 * Voice API - Voice-to-Task Pipeline
 * Handles audio upload, transcription, semantic extraction, and task generation
 *
 * @module api/voice
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Import voice pipeline modules
import {
  createAudioProcessorStore,
  validateAudio,
  initializeUpload,
  addChunk,
  assembleChunks,
  getUploadStatus,
  generateUploadId,
  getAudioProcessorStats,
  type AudioProcessorStore,
  type AudioChunk
} from '@/lib/voice/audio-processor';

import {
  createSTTStore,
  startTranscription,
  completeTranscription,
  getTranscription,
  createMockTranscription,
  getSTTStats,
  type STTStore,
  type TranscriptionRequest
} from '@/lib/voice/speech-to-text';

import {
  createExtractionStore,
  startExtraction,
  completeExtraction,
  extractWithLLM,
  getExtraction,
  type ExtractionStore,
  type HouseholdContext,
  type SupportedLanguage
} from '@/lib/voice/semantic-extractor';

import {
  createTaskGeneratorStore,
  generateTaskPreview,
  addPreview,
  confirmTask,
  cancelPreview,
  updatePreview,
  getPreview,
  getPendingPreviews,
  getConfirmedTasks,
  createMockWorkloads,
  type TaskGeneratorStore,
  type TaskPriority
} from '@/lib/voice/task-generator';

// =============================================================================
// IN-MEMORY STORES (replace with database in production)
// =============================================================================

let audioStore: AudioProcessorStore = createAudioProcessorStore();
let sttStore: STTStore = createSTTStore();
let extractionStore: ExtractionStore = createExtractionStore();
let taskStore: TaskGeneratorStore = createTaskGeneratorStore();

// Mock household context (replace with database lookup in production)
const mockHouseholdContext: HouseholdContext = {
  householdId: 'household_demo',
  children: [
    { id: 'child_lucas', name: 'Lucas', nicknames: ['Lulu', 'Lou'], age: 8 },
    { id: 'child_emma', name: 'Emma', nicknames: ['Mimi', 'Em'], age: 5 },
    { id: 'child_hugo', name: 'Hugo', nicknames: ['Huhu'], age: 12 }
  ],
  parents: [
    { id: 'parent_sophie', name: 'Sophie', role: 'mother' },
    { id: 'parent_thomas', name: 'Thomas', role: 'father' }
  ]
};

// Mock workloads (replace with database lookup in production)
const mockWorkloads = createMockWorkloads();

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const UploadInitRequestSchema = z.object({
  action: z.literal('init_upload'),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  totalSize: z.number().positive(),
  userId: z.string().min(1),
  language: z.enum(['fr', 'en', 'es', 'de', 'it', 'pt']).optional()
});

const UploadChunkRequestSchema = z.object({
  action: z.literal('upload_chunk'),
  uploadId: z.string().min(1),
  chunkIndex: z.number().min(0),
  totalChunks: z.number().min(1),
  chunkData: z.string().min(1) // Base64 encoded
});

const AssembleUploadRequestSchema = z.object({
  action: z.literal('assemble_upload'),
  uploadId: z.string().min(1)
});

const TranscribeRequestSchema = z.object({
  action: z.literal('transcribe'),
  uploadId: z.string().min(1),
  language: z.enum(['fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'auto']).optional(),
  provider: z.enum(['whisper', 'deepgram']).optional()
});

const ExtractRequestSchema = z.object({
  action: z.literal('extract'),
  transcriptionId: z.string().min(1),
  householdId: z.string().optional()
});

const GeneratePreviewRequestSchema = z.object({
  action: z.literal('generate_preview'),
  extractionId: z.string().min(1),
  householdId: z.string().optional()
});

const ConfirmTaskRequestSchema = z.object({
  action: z.literal('confirm_task'),
  previewId: z.string().min(1),
  householdId: z.string().min(1),
  userId: z.string().min(1),
  overrides: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    childId: z.string().nullable().optional(),
    assigneeId: z.string().nullable().optional()
  }).optional()
});

const CancelPreviewRequestSchema = z.object({
  action: z.literal('cancel_preview'),
  previewId: z.string().min(1)
});

const UpdatePreviewRequestSchema = z.object({
  action: z.literal('update_preview'),
  previewId: z.string().min(1),
  updates: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    childId: z.string().nullable().optional(),
    childName: z.string().nullable().optional(),
    suggestedAssigneeId: z.string().nullable().optional(),
    suggestedAssigneeName: z.string().nullable().optional()
  })
});

const GetStatusRequestSchema = z.object({
  action: z.literal('get_status'),
  uploadId: z.string().optional(),
  transcriptionId: z.string().optional(),
  extractionId: z.string().optional(),
  previewId: z.string().optional()
});

const GetPendingPreviewsRequestSchema = z.object({
  action: z.literal('get_pending_previews')
});

const GetConfirmedTasksRequestSchema = z.object({
  action: z.literal('get_confirmed_tasks'),
  householdId: z.string().optional(),
  childId: z.string().optional(),
  assigneeId: z.string().optional()
});

const FullPipelineRequestSchema = z.object({
  action: z.literal('full_pipeline'),
  audioData: z.string().min(1), // Base64 encoded complete audio
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  language: z.enum(['fr', 'en', 'es', 'de', 'it', 'pt']).optional(),
  householdId: z.string().optional(),
  userId: z.string().min(1)
});

const RequestSchema = z.discriminatedUnion('action', [
  UploadInitRequestSchema,
  UploadChunkRequestSchema,
  AssembleUploadRequestSchema,
  TranscribeRequestSchema,
  ExtractRequestSchema,
  GeneratePreviewRequestSchema,
  ConfirmTaskRequestSchema,
  CancelPreviewRequestSchema,
  UpdatePreviewRequestSchema,
  GetStatusRequestSchema,
  GetPendingPreviewsRequestSchema,
  GetConfirmedTasksRequestSchema,
  FullPipelineRequestSchema
]);

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

async function handleInitUpload(
  request: z.infer<typeof UploadInitRequestSchema>
): Promise<NextResponse> {
  const validation = validateAudio(request.filename, request.totalSize, 10, request.mimeType);
  if (!validation.valid) {
    return errorResponse(`Invalid audio: ${validation.errors.join(', ')}`);
  }

  const uploadId = generateUploadId();
  audioStore = initializeUpload(audioStore, uploadId, request.userId, request.filename, request.totalSize);

  return successResponse({
    uploadId,
    maxDuration: 30,
    supportedFormats: ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/webm', 'audio/ogg']
  });
}

async function handleUploadChunk(
  request: z.infer<typeof UploadChunkRequestSchema>
): Promise<NextResponse> {
  let chunkBuffer: Uint8Array;
  try {
    const binaryString = atob(request.chunkData);
    chunkBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      chunkBuffer[i] = binaryString.charCodeAt(i);
    }
  } catch {
    return errorResponse('Invalid base64 chunk data');
  }

  const chunk: Omit<AudioChunk, 'uploadedAt'> = {
    id: `chunk_${request.uploadId}_${request.chunkIndex}`,
    index: request.chunkIndex,
    totalChunks: request.totalChunks,
    data: new Uint8Array(chunkBuffer.buffer.slice(0)) as Uint8Array<ArrayBuffer>,
    size: chunkBuffer.length
  };

  audioStore = addChunk(audioStore, request.uploadId, chunk);
  const status = getUploadStatus(audioStore, request.uploadId);

  if (!status) {
    return errorResponse('Upload not found');
  }

  return successResponse({
    uploadId: request.uploadId,
    chunkIndex: request.chunkIndex,
    receivedChunks: status.chunks.length,
    totalChunks: request.totalChunks,
    isComplete: status.status === 'complete'
  });
}

async function handleAssembleUpload(
  request: z.infer<typeof AssembleUploadRequestSchema>
): Promise<NextResponse> {
  const status = getUploadStatus(audioStore, request.uploadId);
  if (!status) return errorResponse('Upload not found');
  if (status.status !== 'complete') return errorResponse('Upload not complete');

  const assembled = assembleChunks(audioStore, request.uploadId);
  if (!assembled) return errorResponse('Failed to assemble audio');

  return successResponse({ uploadId: request.uploadId, audioSize: assembled.length, isReady: true });
}

async function handleTranscribe(
  request: z.infer<typeof TranscribeRequestSchema>
): Promise<NextResponse> {
  const uploadStatus = getUploadStatus(audioStore, request.uploadId);
  if (!uploadStatus || uploadStatus.status !== 'complete') {
    return errorResponse('Audio upload not complete or not found');
  }

  const transcriptionReq: TranscriptionRequest = {
    audioId: request.uploadId,
    audioUrl: `internal://${request.uploadId}`,
    language: request.language || 'auto',
    enableWordTimings: false,
    enableSegments: true,
    provider: request.provider
  };

  sttStore = startTranscription(sttStore, transcriptionReq);
  const language = (request.language || 'fr') as SupportedLanguage;
  const mockText = getMockTranscriptionText(language);

  const result = createMockTranscription(request.uploadId, mockText, language, request.provider || 'whisper');
  sttStore = completeTranscription(sttStore, result);

  return successResponse({
    transcriptionId: result.id,
    text: result.text,
    language: result.language,
    confidence: result.confidence,
    duration: result.duration,
    provider: result.provider
  });
}

async function handleExtract(
  request: z.infer<typeof ExtractRequestSchema>
): Promise<NextResponse> {
  const transcription = getTranscription(sttStore, request.transcriptionId);
  if (!transcription) return errorResponse('Transcription not found');

  extractionStore = startExtraction(extractionStore, request.transcriptionId);
  const extraction = await extractWithLLM(
    request.transcriptionId,
    transcription.text,
    transcription.language as SupportedLanguage,
    mockHouseholdContext
  );
  extractionStore = completeExtraction(extractionStore, extraction);

  return successResponse({
    extractionId: extraction.id,
    originalText: extraction.originalText,
    action: extraction.action,
    child: extraction.child,
    date: { raw: extraction.date.raw, parsed: extraction.date.parsed?.toISOString() || null, type: extraction.date.type },
    category: extraction.category,
    urgency: extraction.urgency,
    overallConfidence: extraction.overallConfidence,
    warnings: extraction.warnings
  });
}

async function handleGeneratePreview(
  request: z.infer<typeof GeneratePreviewRequestSchema>
): Promise<NextResponse> {
  const extraction = getExtraction(extractionStore, request.extractionId);
  if (!extraction) return errorResponse('Extraction not found');

  const preview = generateTaskPreview(extraction, mockHouseholdContext, mockWorkloads);
  taskStore = addPreview(taskStore, preview);

  return successResponse({
    previewId: preview.id,
    title: preview.title,
    description: preview.description,
    category: preview.category,
    priority: preview.priority,
    dueDate: preview.dueDate?.toISOString() || null,
    isRecurring: preview.isRecurring,
    childId: preview.childId,
    childName: preview.childName,
    suggestedAssigneeId: preview.suggestedAssigneeId,
    suggestedAssigneeName: preview.suggestedAssigneeName,
    chargeWeight: preview.chargeWeight,
    confidence: preview.confidence,
    warnings: preview.warnings,
    alternativeTitles: preview.alternativeTitles
  });
}

async function handleConfirmTask(
  request: z.infer<typeof ConfirmTaskRequestSchema>
): Promise<NextResponse> {
  const overrides = request.overrides ? {
    title: request.overrides.title,
    description: request.overrides.description,
    priority: request.overrides.priority as TaskPriority | undefined,
    dueDate: request.overrides.dueDate ? new Date(request.overrides.dueDate) : undefined,
    childId: request.overrides.childId,
    assigneeId: request.overrides.assigneeId
  } : undefined;

  const result = confirmTask(taskStore, request.previewId, request.householdId, request.userId, overrides);
  taskStore = result.store;

  if (!result.task) return errorResponse('Preview not found or already confirmed');

  return successResponse({
    taskId: result.task.id,
    title: result.task.title,
    status: result.task.status,
    priority: result.task.priority,
    dueDate: result.task.dueDate?.toISOString() || null,
    childId: result.task.childId,
    assigneeId: result.task.assigneeId,
    chargeWeight: result.task.chargeWeight,
    source: result.task.source,
    createdAt: result.task.createdAt.toISOString()
  });
}

async function handleCancelPreview(
  request: z.infer<typeof CancelPreviewRequestSchema>
): Promise<NextResponse> {
  const preview = getPreview(taskStore, request.previewId);
  if (!preview) return errorResponse('Preview not found');
  taskStore = cancelPreview(taskStore, request.previewId);
  return successResponse({ previewId: request.previewId, cancelled: true });
}

async function handleUpdatePreview(
  request: z.infer<typeof UpdatePreviewRequestSchema>
): Promise<NextResponse> {
  const preview = getPreview(taskStore, request.previewId);
  if (!preview) return errorResponse('Preview not found');

  const updates = {
    ...request.updates,
    dueDate: request.updates.dueDate ? (request.updates.dueDate === null ? null : new Date(request.updates.dueDate)) : undefined,
    priority: request.updates.priority as TaskPriority | undefined
  };

  taskStore = updatePreview(taskStore, request.previewId, updates);
  const updated = getPreview(taskStore, request.previewId);

  return successResponse({
    previewId: request.previewId,
    updated: true,
    preview: updated ? { title: updated.title, category: updated.category, priority: updated.priority } : null
  });
}

async function handleGetStatus(
  request: z.infer<typeof GetStatusRequestSchema>
): Promise<NextResponse> {
  const status: Record<string, unknown> = {};

  if (request.uploadId) {
    const s = getUploadStatus(audioStore, request.uploadId);
    status['upload'] = s ? { uploadId: s.uploadId, status: s.status, uploadedSize: s.uploadedSize } : { error: 'Not found' };
  }
  if (request.transcriptionId) {
    const t = getTranscription(sttStore, request.transcriptionId);
    status['transcription'] = t ? { id: t.id, text: t.text, confidence: t.confidence } : { error: 'Not found' };
  }
  if (request.extractionId) {
    const e = getExtraction(extractionStore, request.extractionId);
    status['extraction'] = e ? { id: e.id, category: e.category.primary, confidence: e.overallConfidence } : { error: 'Not found' };
  }
  if (request.previewId) {
    const p = getPreview(taskStore, request.previewId);
    status['preview'] = p ? { id: p.id, title: p.title, priority: p.priority } : { error: 'Not found' };
  }

  return successResponse(status);
}

async function handleGetPendingPreviews(): Promise<NextResponse> {
  const previews = getPendingPreviews(taskStore);
  return successResponse({
    count: previews.length,
    previews: previews.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      priority: p.priority,
      dueDate: p.dueDate?.toISOString() || null,
      confidence: p.confidence
    }))
  });
}

async function handleGetConfirmedTasks(
  request: z.infer<typeof GetConfirmedTasksRequestSchema>
): Promise<NextResponse> {
  const tasks = getConfirmedTasks(taskStore, {
    householdId: request.householdId,
    childId: request.childId,
    assigneeId: request.assigneeId
  });

  return successResponse({
    count: tasks.length,
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() || null,
      childId: t.childId,
      assigneeId: t.assigneeId
    }))
  });
}

async function handleFullPipeline(
  request: z.infer<typeof FullPipelineRequestSchema>
): Promise<NextResponse> {
  const language = (request.language || 'fr') as SupportedLanguage;

  try {
    const audioId = generateUploadId();
    const mockText = getMockTranscriptionText(language);

    const transcriptionReq: TranscriptionRequest = {
      audioId,
      audioUrl: `internal://${audioId}`,
      language,
      enableWordTimings: false,
      enableSegments: true,
      provider: 'whisper'
    };

    sttStore = startTranscription(sttStore, transcriptionReq);
    const transcription = createMockTranscription(audioId, mockText, language);
    sttStore = completeTranscription(sttStore, transcription);

    extractionStore = startExtraction(extractionStore, transcription.id);
    const extraction = await extractWithLLM(transcription.id, transcription.text, language, mockHouseholdContext);
    extractionStore = completeExtraction(extractionStore, extraction);

    const preview = generateTaskPreview(extraction, mockHouseholdContext, mockWorkloads);
    taskStore = addPreview(taskStore, preview);

    return successResponse({
      transcription: { id: transcription.id, text: transcription.text, confidence: transcription.confidence },
      extraction: { id: extraction.id, category: extraction.category, urgency: extraction.urgency, confidence: extraction.overallConfidence },
      preview: { id: preview.id, title: preview.title, priority: preview.priority, confidence: preview.confidence }
    });
  } catch (error) {
    return errorResponse(`Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}

// =============================================================================
// MOCK TRANSCRIPTION HELPER
// =============================================================================

function getMockTranscriptionText(language: string): string {
  const mockTexts: Record<string, readonly string[]> = {
    fr: ['Il faut emmener Lucas chez le médecin demain pour son vaccin', 'Penser à acheter les fournitures scolaires pour Emma cette semaine'],
    en: ['Need to take Lucas to the doctor tomorrow for his vaccine', 'Remember to buy school supplies for Emma this week'],
    es: ['Hay que llevar a Lucas al médico mañana para su vacuna', 'Acordarse de comprar los útiles escolares para Emma esta semana'],
    de: ['Lucas muss morgen zum Arzt für seine Impfung', 'Diese Woche Schulsachen für Emma kaufen nicht vergessen'],
    it: ['Bisogna portare Lucas dal medico domani per il suo vaccino', 'Ricordarsi di comprare il materiale scolastico per Emma questa settimana'],
    pt: ['Precisa levar o Lucas ao médico amanhã para a vacina dele', 'Lembrar de comprar o material escolar para a Emma esta semana'],
    nl: ['Lucas moet morgen naar de dokter voor zijn vaccinatie', 'Schoolspullen kopen voor Emma deze week'],
    auto: ['Il faut emmener Lucas chez le médecin demain pour son vaccin']
  };

  const texts = mockTexts[language] ?? mockTexts['fr'] ?? ['Tâche à faire'];
  return texts[Math.floor(Math.random() * texts.length)] ?? 'Tâche à faire';
}

// =============================================================================
// MAIN HANDLERS
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(`Invalid request: ${parsed.error.message}`);
    }

    switch (parsed.data.action) {
      case 'init_upload': return handleInitUpload(parsed.data);
      case 'upload_chunk': return handleUploadChunk(parsed.data);
      case 'assemble_upload': return handleAssembleUpload(parsed.data);
      case 'transcribe': return handleTranscribe(parsed.data);
      case 'extract': return handleExtract(parsed.data);
      case 'generate_preview': return handleGeneratePreview(parsed.data);
      case 'confirm_task': return handleConfirmTask(parsed.data);
      case 'cancel_preview': return handleCancelPreview(parsed.data);
      case 'update_preview': return handleUpdatePreview(parsed.data);
      case 'get_status': return handleGetStatus(parsed.data);
      case 'get_pending_previews': return handleGetPendingPreviews();
      case 'get_confirmed_tasks': return handleGetConfirmedTasks(parsed.data);
      case 'full_pipeline': return handleFullPipeline(parsed.data);
      default: return errorResponse('Unknown action');
    }
  } catch (error) {
    console.error('Voice API error:', error);
    return errorResponse(`Server error: ${error instanceof Error ? error.message : 'Unknown'}`, 500);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'stats':
      return successResponse({
        audio: getAudioProcessorStats(audioStore),
        stt: getSTTStats(sttStore),
        extraction: { pending: extractionStore.pendingExtractions.size, completed: extractionStore.extractions.size },
        tasks: { pending: taskStore.pendingConfirmation.size, confirmed: taskStore.confirmedTasks.size }
      });
    case 'pending':
      return handleGetPendingPreviews();
    case 'household':
      return successResponse({ household: mockHouseholdContext });
    default:
      return successResponse({
        service: 'voice-to-task',
        version: '1.0.0',
        endpoints: {
          POST: ['init_upload', 'upload_chunk', 'assemble_upload', 'transcribe', 'extract', 'generate_preview', 'confirm_task', 'cancel_preview', 'update_preview', 'get_status', 'get_pending_previews', 'get_confirmed_tasks', 'full_pipeline'],
          GET: ['stats', 'pending', 'household']
        }
      });
  }
}
