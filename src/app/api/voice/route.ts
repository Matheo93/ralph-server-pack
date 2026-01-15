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

/**
 * Initialize a chunked upload
 */
async function handleInitUpload(
  request: z.infer<typeof UploadInitRequestSchema>
): Promise<NextResponse> {
  // Validate audio metadata (use estimated duration of 10s as placeholder)
  const validation = validateAudio(request.filename, request.totalSize, 10, request.mimeType);
  if (!validation.valid) {
    return errorResponse(`Invalid audio: ${validation.errors.join(', ')}`);
  }

  // Generate upload ID
  const uploadId = generateUploadId();

  // Initialize upload
  audioStore = initializeUpload(
    audioStore,
    uploadId,
    request.userId,
    request.filename,
    request.totalSize
  );

  return successResponse({
    uploadId,
    maxDuration: 30,
    supportedFormats: ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/webm', 'audio/ogg']
  });
}

/**
 * Add a chunk to an upload
 */
async function handleUploadChunk(
  request: z.infer<typeof UploadChunkRequestSchema>
): Promise<NextResponse> {
  // Decode base64 chunk
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

  // Create chunk object
  const chunk: Omit<AudioChunk, 'uploadedAt'> = {
    id: `chunk_${request.uploadId}_${request.chunkIndex}`,
    index: request.chunkIndex,
    totalChunks: request.totalChunks,
    data: new Uint8Array(chunkBuffer.buffer.slice(0)) as Uint8Array<ArrayBuffer>,
    size: chunkBuffer.length
  };

  // Add chunk to store
  audioStore = addChunk(audioStore, request.uploadId, chunk);

  // Get upload status
  const status = getUploadStatus(audioStore, request.uploadId);

  if (!status) {
    return errorResponse('Upload not found');
  }

  const receivedChunks = status.chunks.length;
  const isComplete = status.status === 'complete';

  return successResponse({
    uploadId: request.uploadId,
    chunkIndex: request.chunkIndex,
    receivedChunks,
    totalChunks: request.totalChunks,
    isComplete
  });
}

/**
 * Assemble chunks into complete audio
 */
async function handleAssembleUpload(
  request: z.infer<typeof AssembleUploadRequestSchema>
): Promise<NextResponse> {
  const status = getUploadStatus(audioStore, request.uploadId);

  if (!status) {
    return errorResponse('Upload not found');
  }

  if (status.status !== 'complete') {
    return errorResponse('Upload not complete - missing chunks');
  }

  const assembledAudio = assembleChunks(audioStore, request.uploadId);

  if (!assembledAudio) {
    return errorResponse('Failed to assemble audio');
  }

  return successResponse({
    uploadId: request.uploadId,
    audioSize: assembledAudio.length,
    isReady: true
  });
}

/**
 * Transcribe audio using STT
 */
async function handleTranscribe(
  request: z.infer<typeof TranscribeRequestSchema>
): Promise<NextResponse> {
  // Get upload status to verify audio is ready
  const uploadStatus = getUploadStatus(audioStore, request.uploadId);
  if (!uploadStatus || uploadStatus.status !== 'complete') {
    return errorResponse('Audio upload not complete or not found');
  }

  // Create transcription request
  const transcriptionRequest: TranscriptionRequest = {
    audioId: request.uploadId,
    audioUrl: `internal://${request.uploadId}`, // Placeholder URL
    language: request.language || 'auto',
    enableWordTimings: false,
    enableSegments: true,
    provider: request.provider
  };

  // Start transcription
  sttStore = startTranscription(sttStore, transcriptionRequest);

  // In production, this would call the actual STT API
  // For now, simulate with mock transcription
  const language = (request.language || 'fr') as SupportedLanguage;
  const mockText = getMockTranscriptionText(language);

  // Create mock transcription result
  const transcriptionResult = createMockTranscription(
    request.uploadId,
    mockText,
    language,
    request.provider || 'whisper'
  );

  sttStore = completeTranscription(sttStore, transcriptionResult);

  return successResponse({
    transcriptionId: transcriptionResult.id,
    text: transcriptionResult.text,
    language: transcriptionResult.language,
    confidence: transcriptionResult.confidence,
    duration: transcriptionResult.duration,
    provider: transcriptionResult.provider
  });
}

/**
 * Extract semantic information from transcription
 */
async function handleExtract(
  request: z.infer<typeof ExtractRequestSchema>
): Promise<NextResponse> {
  // Get transcription
  const transcription = getTranscription(sttStore, request.transcriptionId);
  if (!transcription) {
    return errorResponse('Transcription not found');
  }

  // Start extraction
  extractionStore = startExtraction(extractionStore, request.transcriptionId);

  // Get household context (use mock or fetch from database)
  const household = mockHouseholdContext;

  // Perform extraction
  const extraction = await extractWithLLM(
    request.transcriptionId,
    transcription.text,
    transcription.language as SupportedLanguage,
    household
  );

  // Complete extraction
  extractionStore = completeExtraction(extractionStore, extraction);

  return successResponse({
    extractionId: extraction.id,
    originalText: extraction.originalText,
    action: extraction.action,
    child: extraction.child,
    date: {
      raw: extraction.date.raw,
      parsed: extraction.date.parsed?.toISOString() || null,
      type: extraction.date.type
    },
    category: extraction.category,
    urgency: extraction.urgency,
    overallConfidence: extraction.overallConfidence,
    warnings: extraction.warnings
  });
}

/**
 * Generate task preview from extraction
 */
async function handleGeneratePreview(
  request: z.infer<typeof GeneratePreviewRequestSchema>
): Promise<NextResponse> {
  // Get extraction
  const extraction = getExtraction(extractionStore, request.extractionId);
  if (!extraction) {
    return errorResponse('Extraction not found');
  }

  // Get household context
  const household = mockHouseholdContext;

  // Generate preview
  const preview = generateTaskPreview(extraction, household, mockWorkloads);

  // Add to store
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

/**
 * Confirm a task preview
 */
async function handleConfirmTask(
  request: z.infer<typeof ConfirmTaskRequestSchema>
): Promise<NextResponse> {
  // Parse overrides
  const overrides = request.overrides ? {
    title: request.overrides.title,
    description: request.overrides.description,
    priority: request.overrides.priority as TaskPriority | undefined,
    dueDate: request.overrides.dueDate ? new Date(request.overrides.dueDate) : undefined,
    childId: request.overrides.childId,
    assigneeId: request.overrides.assigneeId
  } : undefined;

  // Confirm task
  const result = confirmTask(
    taskStore,
    request.previewId,
    request.householdId,
    request.userId,
    overrides
  );

  taskStore = result.store;

  if (!result.task) {
    return errorResponse('Preview not found or already confirmed');
  }

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

/**
 * Cancel a task preview
 */
async function handleCancelPreview(
  request: z.infer<typeof CancelPreviewRequestSchema>
): Promise<NextResponse> {
  const preview = getPreview(taskStore, request.previewId);
  if (!preview) {
    return errorResponse('Preview not found');
  }

  taskStore = cancelPreview(taskStore, request.previewId);

  return successResponse({
    previewId: request.previewId,
    cancelled: true
  });
}

/**
 * Update a task preview
 */
async function handleUpdatePreview(
  request: z.infer<typeof UpdatePreviewRequestSchema>
): Promise<NextResponse> {
  const preview = getPreview(taskStore, request.previewId);
  if (!preview) {
    return errorResponse('Preview not found');
  }

  // Parse date if provided
  const updates = {
    ...request.updates,
    dueDate: request.updates.dueDate
      ? (request.updates.dueDate === null ? null : new Date(request.updates.dueDate))
      : undefined,
    priority: request.updates.priority as TaskPriority | undefined
  };

  taskStore = updatePreview(taskStore, request.previewId, updates);

  const updatedPreview = getPreview(taskStore, request.previewId);

  return successResponse({
    previewId: request.previewId,
    updated: true,
    preview: updatedPreview ? {
      title: updatedPreview.title,
      description: updatedPreview.description,
      category: updatedPreview.category,
      priority: updatedPreview.priority,
      dueDate: updatedPreview.dueDate?.toISOString() || null,
      childId: updatedPreview.childId,
      childName: updatedPreview.childName
    } : null
  });
}

/**
 * Get status of pipeline items
 */
async function handleGetStatus(
  request: z.infer<typeof GetStatusRequestSchema>
): Promise<NextResponse> {
  const status: Record<string, unknown> = {};

  if (request.uploadId) {
    const uploadStatus = getUploadStatus(audioStore, request.uploadId);
    status['upload'] = uploadStatus ? {
      uploadId: uploadStatus.uploadId,
      status: uploadStatus.status,
      uploadedSize: uploadStatus.uploadedSize,
      totalSize: uploadStatus.totalSize,
      chunksReceived: uploadStatus.chunks.length
    } : { error: 'Not found' };
  }

  if (request.transcriptionId) {
    const transcription = getTranscription(sttStore, request.transcriptionId);
    status['transcription'] = transcription ? {
      id: transcription.id,
      text: transcription.text,
      language: transcription.language,
      confidence: transcription.confidence,
      status: 'completed'
    } : { error: 'Not found' };
  }

  if (request.extractionId) {
    const extraction = getExtraction(extractionStore, request.extractionId);
    status['extraction'] = extraction ? {
      id: extraction.id,
      category: extraction.category.primary,
      urgency: extraction.urgency.level,
      confidence: extraction.overallConfidence,
      status: 'completed'
    } : { error: 'Not found' };
  }

  if (request.previewId) {
    const preview = getPreview(taskStore, request.previewId);
    status['preview'] = preview ? {
      id: preview.id,
      title: preview.title,
      category: preview.category,
      priority: preview.priority,
      status: 'pending_confirmation'
    } : { error: 'Not found' };
  }

  return successResponse(status);
}

/**
 * Get all pending previews
 */
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
      childName: p.childName,
      confidence: p.confidence,
      generatedAt: p.generatedAt.toISOString()
    }))
  });
}

/**
 * Get confirmed tasks
 */
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
      assigneeId: t.assigneeId,
      chargeWeight: t.chargeWeight,
      createdAt: t.createdAt.toISOString()
    }))
  });
}

/**
 * Run full pipeline in one request
 */
async function handleFullPipeline(
  request: z.infer<typeof FullPipelineRequestSchema>
): Promise<NextResponse> {
  const language = (request.language || 'fr') as SupportedLanguage;
  const household = mockHouseholdContext;

  try {
    // Step 1: Create mock transcription (in production, would process real audio)
    const audioId = generateUploadId();
    const mockText = getMockTranscriptionText(language);

    const transcriptionRequest: TranscriptionRequest = {
      audioId,
      audioUrl: `internal://${audioId}`,
      language,
      enableWordTimings: false,
      enableSegments: true,
      provider: 'whisper'
    };

    sttStore = startTranscription(sttStore, transcriptionRequest);

    const transcriptionResult = createMockTranscription(
      audioId,
      mockText,
      language
    );

    sttStore = completeTranscription(sttStore, transcriptionResult);

    // Step 2: Extract semantic information
    extractionStore = startExtraction(extractionStore, transcriptionResult.id);

    const extraction = await extractWithLLM(
      transcriptionResult.id,
      transcriptionResult.text,
      language,
      household
    );

    extractionStore = completeExtraction(extractionStore, extraction);

    // Step 3: Generate task preview
    const preview = generateTaskPreview(extraction, household, mockWorkloads);
    taskStore = addPreview(taskStore, preview);

    return successResponse({
      transcription: {
        id: transcriptionResult.id,
        text: transcriptionResult.text,
        language: transcriptionResult.language,
        confidence: transcriptionResult.confidence
      },
      extraction: {
        id: extraction.id,
        action: extraction.action,
        child: extraction.child,
        date: {
          raw: extraction.date.raw,
          parsed: extraction.date.parsed?.toISOString() || null,
          type: extraction.date.type
        },
        category: extraction.category,
        urgency: extraction.urgency,
        confidence: extraction.overallConfidence
      },
      preview: {
        id: preview.id,
        title: preview.title,
        category: preview.category,
        priority: preview.priority,
        dueDate: preview.dueDate?.toISOString() || null,
        childId: preview.childId,
        childName: preview.childName,
        chargeWeight: preview.chargeWeight,
        confidence: preview.confidence,
        warnings: preview.warnings,
        alternativeTitles: preview.alternativeTitles
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Pipeline failed: ${message}`, 500);
  }
}

// =============================================================================
// MOCK TRANSCRIPTION HELPER
// =============================================================================

/**
 * Get mock transcription text based on language
 * In production, this would be replaced by actual STT output
 */
function getMockTranscriptionText(language: string): string {
  const mockTexts: Record<string, readonly string[]> = {
    fr: [
      'Il faut emmener Lucas chez le médecin demain pour son vaccin',
      'Penser à acheter les fournitures scolaires pour Emma cette semaine',
      'Réunion parents-profs vendredi soir à ne pas oublier',
      'Inscription au foot pour Hugo avant la fin du mois',
      'Rendez-vous dentiste pour les enfants la semaine prochaine'
    ],
    en: [
      'Need to take Lucas to the doctor tomorrow for his vaccine',
      'Remember to buy school supplies for Emma this week',
      'Parent-teacher meeting Friday evening not to forget',
      'Register Hugo for soccer before the end of the month',
      'Dentist appointment for the kids next week'
    ],
    es: [
      'Hay que llevar a Lucas al médico mañana para su vacuna',
      'Acordarse de comprar los útiles escolares para Emma esta semana',
      'Reunión de padres el viernes por la noche que no hay que olvidar',
      'Inscribir a Hugo al fútbol antes de fin de mes',
      'Cita con el dentista para los niños la próxima semana'
    ],
    de: [
      'Lucas muss morgen zum Arzt für seine Impfung',
      'Diese Woche Schulsachen für Emma kaufen nicht vergessen',
      'Elternabend am Freitag Abend nicht vergessen',
      'Hugo bis Ende des Monats zum Fußball anmelden',
      'Zahnarzttermin für die Kinder nächste Woche'
    ],
    it: [
      'Bisogna portare Lucas dal medico domani per il suo vaccino',
      'Ricordarsi di comprare il materiale scolastico per Emma questa settimana',
      'Riunione genitori venerdì sera da non dimenticare',
      'Iscrivere Hugo a calcio entro fine mese',
      'Appuntamento dal dentista per i bambini la prossima settimana'
    ],
    pt: [
      'Precisa levar o Lucas ao médico amanhã para a vacina dele',
      'Lembrar de comprar o material escolar para a Emma esta semana',
      'Reunião de pais na sexta à noite não esquecer',
      'Inscrever o Hugo no futebol antes do fim do mês',
      'Consulta no dentista para as crianças na próxima semana'
    ],
    nl: [
      'Lucas moet morgen naar de dokter voor zijn vaccinatie',
      'Schoolspullen kopen voor Emma deze week',
      'Ouderavond vrijdagavond niet vergeten',
      'Hugo inschrijven voor voetbal voor eind van de maand',
      'Tandarts afspraak voor de kinderen volgende week'
    ],
    auto: [
      'Il faut emmener Lucas chez le médecin demain pour son vaccin'
    ]
  };

  const texts = mockTexts[language] ?? mockTexts['fr'] ?? ['Tâche à faire'];
  const randomIndex = Math.floor(Math.random() * texts.length);
  return texts[randomIndex] ?? 'Tâche à faire';
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(`Invalid request: ${parsed.error.message}`);
    }

    const data = parsed.data;

    switch (data.action) {
      case 'init_upload':
        return handleInitUpload(data);

      case 'upload_chunk':
        return handleUploadChunk(data);

      case 'assemble_upload':
        return handleAssembleUpload(data);

      case 'transcribe':
        return handleTranscribe(data);

      case 'extract':
        return handleExtract(data);

      case 'generate_preview':
        return handleGeneratePreview(data);

      case 'confirm_task':
        return handleConfirmTask(data);

      case 'cancel_preview':
        return handleCancelPreview(data);

      case 'update_preview':
        return handleUpdatePreview(data);

      case 'get_status':
        return handleGetStatus(data);

      case 'get_pending_previews':
        return handleGetPendingPreviews();

      case 'get_confirmed_tasks':
        return handleGetConfirmedTasks(data);

      case 'full_pipeline':
        return handleFullPipeline(data);

      default:
        return errorResponse('Unknown action');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Voice API error:', message);
    return errorResponse(`Server error: ${message}`, 500);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'stats':
        return successResponse({
          audio: getAudioProcessorStats(audioStore),
          stt: getSTTStats(sttStore),
          extraction: {
            pendingExtractions: extractionStore.pendingExtractions.size,
            completedExtractions: extractionStore.extractions.size,
            stats: extractionStore.stats
          },
          tasks: {
            pendingPreviews: taskStore.pendingConfirmation.size,
            confirmedTasks: taskStore.confirmedTasks.size,
            stats: taskStore.stats
          }
        });

      case 'pending':
        return handleGetPendingPreviews();

      case 'household':
        return successResponse({
          household: mockHouseholdContext
        });

      default:
        return successResponse({
          service: 'voice-to-task',
          version: '1.0.0',
          endpoints: {
            POST: [
              'init_upload',
              'upload_chunk',
              'assemble_upload',
              'transcribe',
              'extract',
              'generate_preview',
              'confirm_task',
              'cancel_preview',
              'update_preview',
              'get_status',
              'get_pending_previews',
              'get_confirmed_tasks',
              'full_pipeline'
            ],
            GET: ['stats', 'pending', 'household']
          }
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Server error: ${message}`, 500);
  }
}
