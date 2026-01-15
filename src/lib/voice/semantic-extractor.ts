/**
 * Semantic Extractor - LLM-based field extraction from transcribed text
 * Extracts: action, child, date, category, urgency with confidence scoring
 *
 * @module voice/semantic-extractor
 */

import { z } from 'zod';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Supported languages for extraction
 */
export const SupportedLanguageSchema = z.enum(['fr', 'en', 'es', 'de', 'it', 'pt']);
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

/**
 * Task categories that can be detected
 */
export const TaskCategorySchema = z.enum([
  'health',           // Santé: vaccins, médecin, dentiste
  'education',        // Éducation: école, devoirs, inscriptions
  'activities',       // Activités: sport, musique, loisirs
  'administrative',   // Administratif: papiers, assurance
  'household',        // Maison: courses, ménage
  'transport',        // Transport: emmener, chercher
  'social',           // Social: anniversaires, fêtes
  'finance',          // Finance: paiements, allocations
  'clothing',         // Vêtements: achats, entretien
  'food',             // Alimentation: repas, goûter
  'hygiene',          // Hygiène: bain, coiffeur
  'sleep',            // Sommeil: coucher, routines
  'other'             // Autre
]);
export type TaskCategory = z.infer<typeof TaskCategorySchema>;

/**
 * Urgency levels
 */
export const UrgencyLevelSchema = z.enum([
  'critical',   // Aujourd'hui, urgent
  'high',       // Cette semaine
  'medium',     // Ce mois
  'low',        // Quand possible
  'none'        // Pas d'urgence détectée
]);
export type UrgencyLevel = z.infer<typeof UrgencyLevelSchema>;

/**
 * Confidence level for extracted fields
 */
export const ConfidenceSchema = z.object({
  score: z.number().min(0).max(1),
  reason: z.string(),
  alternatives: z.array(z.string()).optional()
});
export type Confidence = z.infer<typeof ConfidenceSchema>;

/**
 * Extracted date information
 */
export const ExtractedDateSchema = z.object({
  raw: z.string(),                          // Original text: "demain", "next Monday"
  parsed: z.date().nullable(),              // Parsed date or null
  type: z.enum(['absolute', 'relative', 'recurring', 'none']),
  recurrence: z.string().optional(),        // "weekly", "monthly", etc.
  confidence: ConfidenceSchema
});
export type ExtractedDate = z.infer<typeof ExtractedDateSchema>;

/**
 * Extracted child reference
 */
export const ExtractedChildSchema = z.object({
  raw: z.string(),                          // Original text: "Lucas", "le petit"
  matchedId: z.string().nullable(),         // Matched child ID from household
  matchedName: z.string().nullable(),       // Matched child name
  confidence: ConfidenceSchema
});
export type ExtractedChild = z.infer<typeof ExtractedChildSchema>;

/**
 * Extracted action/task description
 */
export const ExtractedActionSchema = z.object({
  raw: z.string(),                          // Original text
  normalized: z.string(),                   // Cleaned up version
  verb: z.string().nullable(),              // Main verb: "emmener", "acheter"
  object: z.string().nullable(),            // Object: "chez le médecin", "des cahiers"
  confidence: ConfidenceSchema
});
export type ExtractedAction = z.infer<typeof ExtractedActionSchema>;

/**
 * Extracted category
 */
export const ExtractedCategorySchema = z.object({
  primary: TaskCategorySchema,
  secondary: TaskCategorySchema.nullable(),
  confidence: ConfidenceSchema
});
export type ExtractedCategory = z.infer<typeof ExtractedCategorySchema>;

/**
 * Extracted urgency
 */
export const ExtractedUrgencySchema = z.object({
  level: UrgencyLevelSchema,
  indicators: z.array(z.string()),          // Words that indicated urgency
  confidence: ConfidenceSchema
});
export type ExtractedUrgency = z.infer<typeof ExtractedUrgencySchema>;

/**
 * Complete extraction result
 */
export const ExtractionResultSchema = z.object({
  id: z.string(),
  transcriptionId: z.string(),
  originalText: z.string(),
  language: SupportedLanguageSchema,
  action: ExtractedActionSchema,
  child: ExtractedChildSchema.nullable(),
  date: ExtractedDateSchema,
  category: ExtractedCategorySchema,
  urgency: ExtractedUrgencySchema,
  assigneeSuggestion: z.string().nullable(),
  overallConfidence: z.number().min(0).max(1),
  extractedAt: z.date(),
  processingTimeMs: z.number(),
  llmModel: z.string(),
  warnings: z.array(z.string())
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

/**
 * Household context for child matching
 */
export const HouseholdContextSchema = z.object({
  householdId: z.string(),
  children: z.array(z.object({
    id: z.string(),
    name: z.string(),
    nicknames: z.array(z.string()),
    age: z.number()
  })),
  parents: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string()
  }))
});
export type HouseholdContext = z.infer<typeof HouseholdContextSchema>;

/**
 * LLM provider configuration
 */
export const LLMProviderSchema = z.enum(['openai', 'mistral', 'anthropic', 'mock']);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

/**
 * Extraction options
 */
export const ExtractionOptionsSchema = z.object({
  provider: LLMProviderSchema.default('openai'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.1),
  maxTokens: z.number().default(1000),
  timeout: z.number().default(30000),
  retries: z.number().default(2)
});
export type ExtractionOptions = z.infer<typeof ExtractionOptionsSchema>;

/**
 * Extraction store state
 */
export const ExtractionStoreSchema = z.object({
  extractions: z.map(z.string(), ExtractionResultSchema),
  pendingExtractions: z.set(z.string()),
  failedExtractions: z.map(z.string(), z.object({
    error: z.string(),
    attempts: z.number(),
    lastAttempt: z.date()
  })),
  stats: z.object({
    totalExtractions: z.number(),
    successfulExtractions: z.number(),
    failedExtractions: z.number(),
    averageConfidence: z.number(),
    averageProcessingMs: z.number()
  })
});
export type ExtractionStore = z.infer<typeof ExtractionStoreSchema>;

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

/**
 * Language-specific prompt templates for extraction
 */
const PROMPT_TEMPLATES: Record<SupportedLanguage, {
  systemPrompt: string;
  userPromptTemplate: string;
}> = {
  fr: {
    systemPrompt: `Tu es un assistant spécialisé dans l'extraction d'informations de tâches familiales à partir de commandes vocales.
Tu dois extraire les éléments suivants de manière structurée:
- ACTION: La tâche à accomplir (verbe + complément)
- ENFANT: Le prénom de l'enfant concerné (si mentionné)
- DATE: La date ou échéance mentionnée
- CATEGORIE: Une des catégories: health, education, activities, administrative, household, transport, social, finance, clothing, food, hygiene, sleep, other
- URGENCE: critical (aujourd'hui/urgent), high (cette semaine), medium (ce mois), low (quand possible), none

Réponds UNIQUEMENT en JSON valide sans commentaires.`,
    userPromptTemplate: `Analyse cette commande vocale et extrais les informations:

Texte: "{text}"

Contexte du foyer:
{householdContext}

Réponds en JSON avec cette structure exacte:
{
  "action": {
    "raw": "texte original de l'action",
    "normalized": "version nettoyée",
    "verb": "verbe principal",
    "object": "complément"
  },
  "child": {
    "raw": "prénom mentionné ou null",
    "matchedName": "prénom correspondant dans le foyer ou null"
  },
  "date": {
    "raw": "mention temporelle originale",
    "type": "absolute|relative|recurring|none",
    "recurrence": "si récurrent"
  },
  "category": {
    "primary": "catégorie principale",
    "secondary": "catégorie secondaire ou null"
  },
  "urgency": {
    "level": "critical|high|medium|low|none",
    "indicators": ["mots indiquant l'urgence"]
  },
  "assigneeSuggestion": "suggestion d'assignation ou null"
}`
  },
  en: {
    systemPrompt: `You are an assistant specialized in extracting family task information from voice commands.
You must extract the following elements in a structured way:
- ACTION: The task to accomplish (verb + complement)
- CHILD: The child's name mentioned (if any)
- DATE: The mentioned date or deadline
- CATEGORY: One of: health, education, activities, administrative, household, transport, social, finance, clothing, food, hygiene, sleep, other
- URGENCY: critical (today/urgent), high (this week), medium (this month), low (when possible), none

Reply ONLY with valid JSON without comments.`,
    userPromptTemplate: `Analyze this voice command and extract information:

Text: "{text}"

Household context:
{householdContext}

Reply in JSON with this exact structure:
{
  "action": {
    "raw": "original action text",
    "normalized": "cleaned version",
    "verb": "main verb",
    "object": "complement"
  },
  "child": {
    "raw": "mentioned name or null",
    "matchedName": "matching name in household or null"
  },
  "date": {
    "raw": "original time reference",
    "type": "absolute|relative|recurring|none",
    "recurrence": "if recurring"
  },
  "category": {
    "primary": "main category",
    "secondary": "secondary category or null"
  },
  "urgency": {
    "level": "critical|high|medium|low|none",
    "indicators": ["words indicating urgency"]
  },
  "assigneeSuggestion": "assignment suggestion or null"
}`
  },
  es: {
    systemPrompt: `Eres un asistente especializado en extraer información de tareas familiares a partir de comandos de voz.
Debes extraer los siguientes elementos de forma estructurada:
- ACCIÓN: La tarea a realizar (verbo + complemento)
- NIÑO: El nombre del niño mencionado (si hay)
- FECHA: La fecha o plazo mencionado
- CATEGORÍA: Una de: health, education, activities, administrative, household, transport, social, finance, clothing, food, hygiene, sleep, other
- URGENCIA: critical (hoy/urgente), high (esta semana), medium (este mes), low (cuando sea posible), none

Responde SOLO con JSON válido sin comentarios.`,
    userPromptTemplate: `Analiza este comando de voz y extrae la información:

Texto: "{text}"

Contexto del hogar:
{householdContext}

Responde en JSON con esta estructura exacta:
{
  "action": {
    "raw": "texto original de la acción",
    "normalized": "versión limpia",
    "verb": "verbo principal",
    "object": "complemento"
  },
  "child": {
    "raw": "nombre mencionado o null",
    "matchedName": "nombre correspondiente en el hogar o null"
  },
  "date": {
    "raw": "referencia temporal original",
    "type": "absolute|relative|recurring|none",
    "recurrence": "si es recurrente"
  },
  "category": {
    "primary": "categoría principal",
    "secondary": "categoría secundaria o null"
  },
  "urgency": {
    "level": "critical|high|medium|low|none",
    "indicators": ["palabras que indican urgencia"]
  },
  "assigneeSuggestion": "sugerencia de asignación o null"
}`
  },
  de: {
    systemPrompt: `Du bist ein Assistent, der auf die Extraktion von Familienaufgaben aus Sprachbefehlen spezialisiert ist.
Du musst folgende Elemente strukturiert extrahieren:
- AKTION: Die zu erledigende Aufgabe (Verb + Ergänzung)
- KIND: Der erwähnte Kindername (falls vorhanden)
- DATUM: Das erwähnte Datum oder die Frist
- KATEGORIE: Eine von: health, education, activities, administrative, household, transport, social, finance, clothing, food, hygiene, sleep, other
- DRINGLICHKEIT: critical (heute/dringend), high (diese Woche), medium (diesen Monat), low (wenn möglich), none

Antworte NUR mit gültigem JSON ohne Kommentare.`,
    userPromptTemplate: `Analysiere diesen Sprachbefehl und extrahiere die Informationen:

Text: "{text}"

Haushaltskontext:
{householdContext}

Antworte im JSON mit dieser exakten Struktur:
{
  "action": {
    "raw": "Original-Aktionstext",
    "normalized": "bereinigte Version",
    "verb": "Hauptverb",
    "object": "Ergänzung"
  },
  "child": {
    "raw": "erwähnter Name oder null",
    "matchedName": "passender Name im Haushalt oder null"
  },
  "date": {
    "raw": "ursprüngliche Zeitangabe",
    "type": "absolute|relative|recurring|none",
    "recurrence": "falls wiederkehrend"
  },
  "category": {
    "primary": "Hauptkategorie",
    "secondary": "Nebenkategorie oder null"
  },
  "urgency": {
    "level": "critical|high|medium|low|none",
    "indicators": ["Wörter die Dringlichkeit anzeigen"]
  },
  "assigneeSuggestion": "Zuweisungsvorschlag oder null"
}`
  },
  it: {
    systemPrompt: `Sei un assistente specializzato nell'estrazione di informazioni sui compiti familiari dai comandi vocali.
Devi estrarre i seguenti elementi in modo strutturato:
- AZIONE: Il compito da svolgere (verbo + complemento)
- BAMBINO: Il nome del bambino menzionato (se presente)
- DATA: La data o scadenza menzionata
- CATEGORIA: Una tra: health, education, activities, administrative, household, transport, social, finance, clothing, food, hygiene, sleep, other
- URGENZA: critical (oggi/urgente), high (questa settimana), medium (questo mese), low (quando possibile), none

Rispondi SOLO con JSON valido senza commenti.`,
    userPromptTemplate: `Analizza questo comando vocale ed estrai le informazioni:

Testo: "{text}"

Contesto familiare:
{householdContext}

Rispondi in JSON con questa struttura esatta:
{
  "action": {
    "raw": "testo originale dell'azione",
    "normalized": "versione pulita",
    "verb": "verbo principale",
    "object": "complemento"
  },
  "child": {
    "raw": "nome menzionato o null",
    "matchedName": "nome corrispondente nella famiglia o null"
  },
  "date": {
    "raw": "riferimento temporale originale",
    "type": "absolute|relative|recurring|none",
    "recurrence": "se ricorrente"
  },
  "category": {
    "primary": "categoria principale",
    "secondary": "categoria secondaria o null"
  },
  "urgency": {
    "level": "critical|high|medium|low|none",
    "indicators": ["parole che indicano urgenza"]
  },
  "assigneeSuggestion": "suggerimento di assegnazione o null"
}`
  },
  pt: {
    systemPrompt: `Você é um assistente especializado em extrair informações de tarefas familiares a partir de comandos de voz.
Você deve extrair os seguintes elementos de forma estruturada:
- AÇÃO: A tarefa a realizar (verbo + complemento)
- CRIANÇA: O nome da criança mencionada (se houver)
- DATA: A data ou prazo mencionado
- CATEGORIA: Uma de: health, education, activities, administrative, household, transport, social, finance, clothing, food, hygiene, sleep, other
- URGÊNCIA: critical (hoje/urgente), high (esta semana), medium (este mês), low (quando possível), none

Responda APENAS com JSON válido sem comentários.`,
    userPromptTemplate: `Analise este comando de voz e extraia as informações:

Texto: "{text}"

Contexto familiar:
{householdContext}

Responda em JSON com esta estrutura exata:
{
  "action": {
    "raw": "texto original da ação",
    "normalized": "versão limpa",
    "verb": "verbo principal",
    "object": "complemento"
  },
  "child": {
    "raw": "nome mencionado ou null",
    "matchedName": "nome correspondente na família ou null"
  },
  "date": {
    "raw": "referência temporal original",
    "type": "absolute|relative|recurring|none",
    "recurrence": "se recorrente"
  },
  "category": {
    "primary": "categoria principal",
    "secondary": "categoria secundária ou null"
  },
  "urgency": {
    "level": "critical|high|medium|low|none",
    "indicators": ["palavras que indicam urgência"]
  },
  "assigneeSuggestion": "sugestão de atribuição ou null"
}`
  }
};

// =============================================================================
// CATEGORY DETECTION KEYWORDS
// =============================================================================

/**
 * Keywords for category detection by language
 */
const CATEGORY_KEYWORDS: Record<SupportedLanguage, Record<TaskCategory, readonly string[]>> = {
  fr: {
    health: ['médecin', 'docteur', 'vaccin', 'pharmacie', 'ordonnance', 'dentiste', 'pédiatre', 'urgences', 'hôpital', 'kiné', 'ophtalmo', 'dermato', 'allergie', 'fièvre', 'malade'],
    education: ['école', 'collège', 'lycée', 'devoirs', 'leçons', 'inscription', 'rentrée', 'fournitures', 'professeur', 'notes', 'bulletin', 'réunion parents', 'cantine', 'étude'],
    activities: ['sport', 'foot', 'tennis', 'natation', 'danse', 'musique', 'piano', 'guitare', 'judo', 'gym', 'équitation', 'club', 'cours', 'entrainement', 'match', 'compétition'],
    administrative: ['papiers', 'carte identité', 'passeport', 'caf', 'assurance', 'mutuelle', 'impôts', 'formulaire', 'attestation', 'certificat', 'dossier', 'mairie'],
    household: ['courses', 'ménage', 'lessive', 'vaisselle', 'rangement', 'aspirateur', 'poubelle', 'jardin', 'bricolage', 'réparer'],
    transport: ['emmener', 'chercher', 'déposer', 'récupérer', 'conduire', 'voiture', 'bus', 'train', 'trajet', 'covoiturage'],
    social: ['anniversaire', 'fête', 'invitation', 'cadeau', 'copain', 'ami', 'soirée pyjama', 'goûter', 'sortie'],
    finance: ['payer', 'virement', 'argent poche', 'tirelire', 'économies', 'facture', 'frais', 'cotisation'],
    clothing: ['vêtements', 'chaussures', 'habits', 'pantalon', 'manteau', 'uniforme', 'acheter', 'taille'],
    food: ['repas', 'goûter', 'petit déjeuner', 'dîner', 'déjeuner', 'recette', 'cuisine', 'menu'],
    hygiene: ['bain', 'douche', 'dents', 'coiffeur', 'shampooing', 'crème', 'poux'],
    sleep: ['coucher', 'dormir', 'lit', 'sieste', 'réveil', 'nuit', 'doudou'],
    other: []
  },
  en: {
    health: ['doctor', 'vaccine', 'pharmacy', 'prescription', 'dentist', 'pediatrician', 'hospital', 'allergies', 'fever', 'sick', 'medicine', 'appointment', 'checkup'],
    education: ['school', 'homework', 'lessons', 'enrollment', 'supplies', 'teacher', 'grades', 'report card', 'parent meeting', 'cafeteria', 'study'],
    activities: ['sports', 'soccer', 'tennis', 'swimming', 'dance', 'music', 'piano', 'guitar', 'judo', 'gym', 'club', 'class', 'practice', 'game', 'competition'],
    administrative: ['papers', 'id card', 'passport', 'insurance', 'tax', 'form', 'certificate', 'document', 'city hall'],
    household: ['groceries', 'cleaning', 'laundry', 'dishes', 'organizing', 'vacuum', 'trash', 'garden', 'repair'],
    transport: ['take', 'pick up', 'drop off', 'drive', 'car', 'bus', 'train', 'commute', 'carpool'],
    social: ['birthday', 'party', 'invitation', 'gift', 'friend', 'sleepover', 'playdate', 'outing'],
    finance: ['pay', 'transfer', 'allowance', 'savings', 'bill', 'fee', 'subscription'],
    clothing: ['clothes', 'shoes', 'outfit', 'pants', 'coat', 'uniform', 'buy', 'size'],
    food: ['meal', 'snack', 'breakfast', 'dinner', 'lunch', 'recipe', 'cooking', 'menu'],
    hygiene: ['bath', 'shower', 'teeth', 'haircut', 'shampoo', 'cream', 'lice'],
    sleep: ['bedtime', 'sleep', 'bed', 'nap', 'wake up', 'night'],
    other: []
  },
  es: {
    health: ['médico', 'doctor', 'vacuna', 'farmacia', 'receta', 'dentista', 'pediatra', 'hospital', 'alergia', 'fiebre', 'enfermo'],
    education: ['escuela', 'colegio', 'deberes', 'lecciones', 'inscripción', 'útiles', 'profesor', 'notas', 'boletín', 'reunión padres', 'comedor'],
    activities: ['deporte', 'fútbol', 'tenis', 'natación', 'baile', 'música', 'piano', 'guitarra', 'judo', 'gimnasio', 'club', 'clase', 'entrenamiento', 'partido'],
    administrative: ['papeles', 'dni', 'pasaporte', 'seguro', 'impuestos', 'formulario', 'certificado', 'documento', 'ayuntamiento'],
    household: ['compras', 'limpieza', 'colada', 'platos', 'orden', 'aspiradora', 'basura', 'jardín', 'reparar'],
    transport: ['llevar', 'recoger', 'dejar', 'conducir', 'coche', 'bus', 'tren', 'viaje'],
    social: ['cumpleaños', 'fiesta', 'invitación', 'regalo', 'amigo', 'pijamada', 'merienda', 'salida'],
    finance: ['pagar', 'transferencia', 'paga', 'ahorros', 'factura', 'cuota'],
    clothing: ['ropa', 'zapatos', 'pantalón', 'abrigo', 'uniforme', 'comprar', 'talla'],
    food: ['comida', 'merienda', 'desayuno', 'cena', 'almuerzo', 'receta', 'cocina', 'menú'],
    hygiene: ['baño', 'ducha', 'dientes', 'peluquería', 'champú', 'crema', 'piojos'],
    sleep: ['acostar', 'dormir', 'cama', 'siesta', 'despertar', 'noche'],
    other: []
  },
  de: {
    health: ['Arzt', 'Impfung', 'Apotheke', 'Rezept', 'Zahnarzt', 'Kinderarzt', 'Krankenhaus', 'Allergie', 'Fieber', 'krank'],
    education: ['Schule', 'Hausaufgaben', 'Unterricht', 'Anmeldung', 'Schulsachen', 'Lehrer', 'Noten', 'Zeugnis', 'Elternabend', 'Mensa'],
    activities: ['Sport', 'Fußball', 'Tennis', 'Schwimmen', 'Tanzen', 'Musik', 'Klavier', 'Gitarre', 'Judo', 'Turnen', 'Verein', 'Kurs', 'Training', 'Spiel'],
    administrative: ['Papiere', 'Ausweis', 'Reisepass', 'Versicherung', 'Steuer', 'Formular', 'Bescheinigung', 'Dokument', 'Rathaus'],
    household: ['Einkaufen', 'Putzen', 'Wäsche', 'Geschirr', 'Aufräumen', 'Staubsaugen', 'Müll', 'Garten', 'Reparieren'],
    transport: ['bringen', 'abholen', 'fahren', 'Auto', 'Bus', 'Zug', 'Fahrt'],
    social: ['Geburtstag', 'Party', 'Einladung', 'Geschenk', 'Freund', 'Übernachtung', 'Ausflug'],
    finance: ['bezahlen', 'Überweisung', 'Taschengeld', 'Ersparnisse', 'Rechnung', 'Gebühr'],
    clothing: ['Kleidung', 'Schuhe', 'Hose', 'Mantel', 'Uniform', 'kaufen', 'Größe'],
    food: ['Essen', 'Snack', 'Frühstück', 'Abendessen', 'Mittagessen', 'Rezept', 'Kochen', 'Menü'],
    hygiene: ['Bad', 'Dusche', 'Zähne', 'Friseur', 'Shampoo', 'Creme', 'Läuse'],
    sleep: ['Schlafenszeit', 'schlafen', 'Bett', 'Nickerchen', 'aufwachen', 'Nacht'],
    other: []
  },
  it: {
    health: ['medico', 'dottore', 'vaccino', 'farmacia', 'ricetta', 'dentista', 'pediatra', 'ospedale', 'allergia', 'febbre', 'malato'],
    education: ['scuola', 'compiti', 'lezioni', 'iscrizione', 'materiale', 'professore', 'voti', 'pagella', 'riunione genitori', 'mensa'],
    activities: ['sport', 'calcio', 'tennis', 'nuoto', 'danza', 'musica', 'piano', 'chitarra', 'judo', 'palestra', 'club', 'corso', 'allenamento', 'partita'],
    administrative: ['documenti', 'carta identità', 'passaporto', 'assicurazione', 'tasse', 'modulo', 'certificato', 'documento', 'comune'],
    household: ['spesa', 'pulizia', 'bucato', 'piatti', 'riordinare', 'aspirapolvere', 'spazzatura', 'giardino', 'riparare'],
    transport: ['portare', 'prendere', 'lasciare', 'guidare', 'macchina', 'autobus', 'treno', 'viaggio'],
    social: ['compleanno', 'festa', 'invito', 'regalo', 'amico', 'pigiama party', 'merenda', 'gita'],
    finance: ['pagare', 'bonifico', 'paghetta', 'risparmi', 'bolletta', 'quota'],
    clothing: ['vestiti', 'scarpe', 'pantaloni', 'cappotto', 'uniforme', 'comprare', 'taglia'],
    food: ['pasto', 'merenda', 'colazione', 'cena', 'pranzo', 'ricetta', 'cucina', 'menù'],
    hygiene: ['bagno', 'doccia', 'denti', 'parrucchiere', 'shampoo', 'crema', 'pidocchi'],
    sleep: ['andare a letto', 'dormire', 'letto', 'pisolino', 'sveglia', 'notte'],
    other: []
  },
  pt: {
    health: ['médico', 'doutor', 'vacina', 'farmácia', 'receita', 'dentista', 'pediatra', 'hospital', 'alergia', 'febre', 'doente'],
    education: ['escola', 'colégio', 'deveres', 'lições', 'inscrição', 'material', 'professor', 'notas', 'boletim', 'reunião pais', 'cantina'],
    activities: ['esporte', 'futebol', 'tênis', 'natação', 'dança', 'música', 'piano', 'violão', 'judô', 'academia', 'clube', 'aula', 'treino', 'jogo'],
    administrative: ['documentos', 'identidade', 'passaporte', 'seguro', 'impostos', 'formulário', 'certificado', 'documento', 'prefeitura'],
    household: ['compras', 'limpeza', 'roupa', 'louça', 'arrumar', 'aspirador', 'lixo', 'jardim', 'consertar'],
    transport: ['levar', 'buscar', 'deixar', 'dirigir', 'carro', 'ônibus', 'trem', 'viagem'],
    social: ['aniversário', 'festa', 'convite', 'presente', 'amigo', 'pernoite', 'lanche', 'passeio'],
    finance: ['pagar', 'transferência', 'mesada', 'economias', 'conta', 'taxa'],
    clothing: ['roupa', 'sapatos', 'calça', 'casaco', 'uniforme', 'comprar', 'tamanho'],
    food: ['refeição', 'lanche', 'café da manhã', 'jantar', 'almoço', 'receita', 'cozinha', 'cardápio'],
    hygiene: ['banho', 'ducha', 'dentes', 'cabeleireiro', 'xampu', 'creme', 'piolhos'],
    sleep: ['dormir', 'cama', 'soneca', 'acordar', 'noite', 'hora de dormir'],
    other: []
  }
};

// =============================================================================
// URGENCY DETECTION KEYWORDS
// =============================================================================

/**
 * Keywords for urgency detection by language
 */
const URGENCY_KEYWORDS: Record<SupportedLanguage, Record<Exclude<UrgencyLevel, 'none'>, readonly string[]>> = {
  fr: {
    critical: ['urgent', 'urgence', "aujourd'hui", 'maintenant', 'immédiatement', 'tout de suite', 'vite', 'absolument', 'impératif', 'critique'],
    high: ['cette semaine', 'bientôt', 'rapidement', 'dès que possible', 'prioritaire', 'important', 'ne pas oublier'],
    medium: ['ce mois', 'prochainement', 'dans les semaines', 'avant la fin du mois'],
    low: ['quand possible', 'éventuellement', 'un jour', 'pas pressé', 'tranquille']
  },
  en: {
    critical: ['urgent', 'emergency', 'today', 'now', 'immediately', 'right away', 'asap', 'critical', 'must'],
    high: ['this week', 'soon', 'quickly', 'priority', 'important', "don't forget"],
    medium: ['this month', 'shortly', 'in the coming weeks', 'before end of month'],
    low: ['when possible', 'eventually', 'someday', 'no rush', 'whenever']
  },
  es: {
    critical: ['urgente', 'emergencia', 'hoy', 'ahora', 'inmediatamente', 'ya', 'crítico', 'debe'],
    high: ['esta semana', 'pronto', 'rápido', 'prioritario', 'importante', 'no olvidar'],
    medium: ['este mes', 'próximamente', 'en las próximas semanas', 'antes de fin de mes'],
    low: ['cuando sea posible', 'eventualmente', 'algún día', 'sin prisa', 'cuando puedas']
  },
  de: {
    critical: ['dringend', 'Notfall', 'heute', 'jetzt', 'sofort', 'unverzüglich', 'kritisch', 'muss'],
    high: ['diese Woche', 'bald', 'schnell', 'Priorität', 'wichtig', 'nicht vergessen'],
    medium: ['diesen Monat', 'demnächst', 'in den nächsten Wochen', 'vor Monatsende'],
    low: ['wenn möglich', 'irgendwann', 'eines Tages', 'keine Eile', 'wenn Zeit ist']
  },
  it: {
    critical: ['urgente', 'emergenza', 'oggi', 'adesso', 'immediatamente', 'subito', 'critico', 'deve'],
    high: ['questa settimana', 'presto', 'velocemente', 'prioritario', 'importante', 'non dimenticare'],
    medium: ['questo mese', 'prossimamente', 'nelle prossime settimane', 'entro fine mese'],
    low: ['quando possibile', 'eventualmente', 'un giorno', 'senza fretta', 'quando puoi']
  },
  pt: {
    critical: ['urgente', 'emergência', 'hoje', 'agora', 'imediatamente', 'já', 'crítico', 'deve'],
    high: ['esta semana', 'em breve', 'rápido', 'prioritário', 'importante', 'não esquecer'],
    medium: ['este mês', 'proximamente', 'nas próximas semanas', 'antes do fim do mês'],
    low: ['quando possível', 'eventualmente', 'um dia', 'sem pressa', 'quando puder']
  }
};

// =============================================================================
// DATE PARSING PATTERNS
// =============================================================================

/**
 * Relative date patterns by language
 */
const DATE_PATTERNS: Record<SupportedLanguage, Record<string, (baseDate: Date) => Date>> = {
  fr: {
    "aujourd'hui": (d) => d,
    'demain': (d) => new Date(d.getTime() + 24 * 60 * 60 * 1000),
    'après-demain': (d) => new Date(d.getTime() + 2 * 24 * 60 * 60 * 1000),
    'lundi': (d) => getNextDayOfWeek(d, 1),
    'mardi': (d) => getNextDayOfWeek(d, 2),
    'mercredi': (d) => getNextDayOfWeek(d, 3),
    'jeudi': (d) => getNextDayOfWeek(d, 4),
    'vendredi': (d) => getNextDayOfWeek(d, 5),
    'samedi': (d) => getNextDayOfWeek(d, 6),
    'dimanche': (d) => getNextDayOfWeek(d, 0),
    'la semaine prochaine': (d) => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000),
    'le mois prochain': (d) => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    'ce week-end': (d) => getNextDayOfWeek(d, 6),
    'ce soir': (d) => d
  },
  en: {
    'today': (d) => d,
    'tomorrow': (d) => new Date(d.getTime() + 24 * 60 * 60 * 1000),
    'day after tomorrow': (d) => new Date(d.getTime() + 2 * 24 * 60 * 60 * 1000),
    'monday': (d) => getNextDayOfWeek(d, 1),
    'tuesday': (d) => getNextDayOfWeek(d, 2),
    'wednesday': (d) => getNextDayOfWeek(d, 3),
    'thursday': (d) => getNextDayOfWeek(d, 4),
    'friday': (d) => getNextDayOfWeek(d, 5),
    'saturday': (d) => getNextDayOfWeek(d, 6),
    'sunday': (d) => getNextDayOfWeek(d, 0),
    'next week': (d) => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000),
    'next month': (d) => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    'this weekend': (d) => getNextDayOfWeek(d, 6),
    'tonight': (d) => d
  },
  es: {
    'hoy': (d) => d,
    'mañana': (d) => new Date(d.getTime() + 24 * 60 * 60 * 1000),
    'pasado mañana': (d) => new Date(d.getTime() + 2 * 24 * 60 * 60 * 1000),
    'lunes': (d) => getNextDayOfWeek(d, 1),
    'martes': (d) => getNextDayOfWeek(d, 2),
    'miércoles': (d) => getNextDayOfWeek(d, 3),
    'jueves': (d) => getNextDayOfWeek(d, 4),
    'viernes': (d) => getNextDayOfWeek(d, 5),
    'sábado': (d) => getNextDayOfWeek(d, 6),
    'domingo': (d) => getNextDayOfWeek(d, 0),
    'la próxima semana': (d) => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000),
    'el próximo mes': (d) => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    'este fin de semana': (d) => getNextDayOfWeek(d, 6),
    'esta noche': (d) => d
  },
  de: {
    'heute': (d) => d,
    'morgen': (d) => new Date(d.getTime() + 24 * 60 * 60 * 1000),
    'übermorgen': (d) => new Date(d.getTime() + 2 * 24 * 60 * 60 * 1000),
    'montag': (d) => getNextDayOfWeek(d, 1),
    'dienstag': (d) => getNextDayOfWeek(d, 2),
    'mittwoch': (d) => getNextDayOfWeek(d, 3),
    'donnerstag': (d) => getNextDayOfWeek(d, 4),
    'freitag': (d) => getNextDayOfWeek(d, 5),
    'samstag': (d) => getNextDayOfWeek(d, 6),
    'sonntag': (d) => getNextDayOfWeek(d, 0),
    'nächste woche': (d) => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000),
    'nächsten monat': (d) => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    'dieses wochenende': (d) => getNextDayOfWeek(d, 6),
    'heute abend': (d) => d
  },
  it: {
    'oggi': (d) => d,
    'domani': (d) => new Date(d.getTime() + 24 * 60 * 60 * 1000),
    'dopodomani': (d) => new Date(d.getTime() + 2 * 24 * 60 * 60 * 1000),
    'lunedì': (d) => getNextDayOfWeek(d, 1),
    'martedì': (d) => getNextDayOfWeek(d, 2),
    'mercoledì': (d) => getNextDayOfWeek(d, 3),
    'giovedì': (d) => getNextDayOfWeek(d, 4),
    'venerdì': (d) => getNextDayOfWeek(d, 5),
    'sabato': (d) => getNextDayOfWeek(d, 6),
    'domenica': (d) => getNextDayOfWeek(d, 0),
    'la prossima settimana': (d) => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000),
    'il prossimo mese': (d) => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    'questo weekend': (d) => getNextDayOfWeek(d, 6),
    'stasera': (d) => d
  },
  pt: {
    'hoje': (d) => d,
    'amanhã': (d) => new Date(d.getTime() + 24 * 60 * 60 * 1000),
    'depois de amanhã': (d) => new Date(d.getTime() + 2 * 24 * 60 * 60 * 1000),
    'segunda': (d) => getNextDayOfWeek(d, 1),
    'terça': (d) => getNextDayOfWeek(d, 2),
    'quarta': (d) => getNextDayOfWeek(d, 3),
    'quinta': (d) => getNextDayOfWeek(d, 4),
    'sexta': (d) => getNextDayOfWeek(d, 5),
    'sábado': (d) => getNextDayOfWeek(d, 6),
    'domingo': (d) => getNextDayOfWeek(d, 0),
    'próxima semana': (d) => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000),
    'próximo mês': (d) => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    'este fim de semana': (d) => getNextDayOfWeek(d, 6),
    'hoje à noite': (d) => d
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the next occurrence of a day of the week
 */
function getNextDayOfWeek(baseDate: Date, dayOfWeek: number): Date {
  const result = new Date(baseDate);
  const currentDay = result.getDay();
  const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
  result.setDate(result.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext));
  return result;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `ext_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
}

// =============================================================================
// STORE CREATION
// =============================================================================

/**
 * Create a new extraction store
 */
export function createExtractionStore(): ExtractionStore {
  return {
    extractions: new Map(),
    pendingExtractions: new Set(),
    failedExtractions: new Map(),
    stats: {
      totalExtractions: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      averageConfidence: 0,
      averageProcessingMs: 0
    }
  };
}

// =============================================================================
// LOCAL EXTRACTION (NO LLM)
// =============================================================================

/**
 * Detect category from text using keyword matching
 */
export function detectCategoryFromKeywords(
  text: string,
  language: SupportedLanguage
): ExtractedCategory {
  const normalizedText = normalizeText(text);
  const keywords = CATEGORY_KEYWORDS[language];

  const scores: Record<TaskCategory, number> = {
    health: 0, education: 0, activities: 0, administrative: 0,
    household: 0, transport: 0, social: 0, finance: 0,
    clothing: 0, food: 0, hygiene: 0, sleep: 0, other: 0
  };

  for (const [category, categoryKeywords] of Object.entries(keywords)) {
    for (const keyword of categoryKeywords) {
      if (normalizedText.includes(normalizeText(keyword))) {
        scores[category as TaskCategory] += 1;
      }
    }
  }

  const sortedCategories = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .filter(([, score]) => score > 0);

  if (sortedCategories.length === 0) {
    return {
      primary: 'other',
      secondary: null,
      confidence: {
        score: 0.3,
        reason: 'No keyword matches found'
      }
    };
  }

  const firstCategory = sortedCategories[0];
  const primary = (firstCategory ? firstCategory[0] : 'other') as TaskCategory;
  const primaryScore = firstCategory ? firstCategory[1] : 0;
  const secondCategory = sortedCategories[1];
  const secondary = (secondCategory ? secondCategory[0] : null) as TaskCategory | null;

  return {
    primary,
    secondary,
    confidence: {
      score: Math.min(0.9, 0.5 + primaryScore * 0.1),
      reason: `Matched ${primaryScore} keyword(s) for ${primary}`,
      alternatives: sortedCategories.slice(1, 3).map(([cat]) => cat)
    }
  };
}

/**
 * Detect urgency from text using keyword matching
 */
export function detectUrgencyFromKeywords(
  text: string,
  language: SupportedLanguage
): ExtractedUrgency {
  const normalizedText = normalizeText(text);
  const keywords = URGENCY_KEYWORDS[language];

  const matchedIndicators: string[] = [];
  let detectedLevel: UrgencyLevel = 'none';

  // Check from highest to lowest urgency
  const levels: Array<Exclude<UrgencyLevel, 'none'>> = ['critical', 'high', 'medium', 'low'];

  for (const level of levels) {
    for (const keyword of keywords[level]) {
      if (normalizedText.includes(normalizeText(keyword))) {
        matchedIndicators.push(keyword);
        if (detectedLevel === 'none' || levels.indexOf(level) < levels.indexOf(detectedLevel as Exclude<UrgencyLevel, 'none'>)) {
          detectedLevel = level;
        }
      }
    }
  }

  return {
    level: detectedLevel,
    indicators: matchedIndicators,
    confidence: {
      score: matchedIndicators.length > 0 ? Math.min(0.9, 0.6 + matchedIndicators.length * 0.1) : 0.5,
      reason: matchedIndicators.length > 0
        ? `Found ${matchedIndicators.length} urgency indicator(s)`
        : 'No urgency indicators found, defaulting to none'
    }
  };
}

/**
 * Parse date from text
 */
export function parseDateFromText(
  text: string,
  language: SupportedLanguage,
  baseDate: Date = new Date()
): ExtractedDate {
  const normalizedText = normalizeText(text);
  const patterns = DATE_PATTERNS[language];

  // Check for relative date patterns
  for (const [pattern, resolver] of Object.entries(patterns)) {
    if (normalizedText.includes(normalizeText(pattern))) {
      return {
        raw: pattern,
        parsed: resolver(baseDate),
        type: 'relative',
        confidence: {
          score: 0.85,
          reason: `Matched relative date pattern: ${pattern}`
        }
      };
    }
  }

  // Check for recurrence patterns
  const recurrencePatterns: Record<SupportedLanguage, Record<string, string>> = {
    fr: { 'tous les jours': 'daily', 'chaque semaine': 'weekly', 'chaque mois': 'monthly', 'toutes les semaines': 'weekly' },
    en: { 'every day': 'daily', 'every week': 'weekly', 'every month': 'monthly', 'daily': 'daily', 'weekly': 'weekly' },
    es: { 'todos los días': 'daily', 'cada semana': 'weekly', 'cada mes': 'monthly' },
    de: { 'jeden tag': 'daily', 'jede woche': 'weekly', 'jeden monat': 'monthly' },
    it: { 'ogni giorno': 'daily', 'ogni settimana': 'weekly', 'ogni mese': 'monthly' },
    pt: { 'todo dia': 'daily', 'toda semana': 'weekly', 'todo mês': 'monthly' }
  };

  for (const [pattern, recurrence] of Object.entries(recurrencePatterns[language])) {
    if (normalizedText.includes(normalizeText(pattern))) {
      return {
        raw: pattern,
        parsed: null,
        type: 'recurring',
        recurrence,
        confidence: {
          score: 0.8,
          reason: `Matched recurrence pattern: ${pattern}`
        }
      };
    }
  }

  // Try to parse absolute date (DD/MM/YYYY or similar)
  const dateRegex = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.]?(\d{2,4})?/;
  const match = text.match(dateRegex);

  if (match && match[1] && match[2]) {
    const fullMatch = match[0] ?? '';
    const day = match[1];
    const month = match[2];
    const year = match[3];
    const parsedYear = year
      ? (year.length === 2 ? 2000 + parseInt(year) : parseInt(year))
      : baseDate.getFullYear();
    const parsedDate = new Date(parsedYear, parseInt(month) - 1, parseInt(day));

    if (!isNaN(parsedDate.getTime())) {
      return {
        raw: fullMatch,
        parsed: parsedDate,
        type: 'absolute',
        confidence: {
          score: 0.9,
          reason: `Parsed absolute date: ${parsedDate.toISOString()}`
        }
      };
    }
  }

  return {
    raw: '',
    parsed: null,
    type: 'none',
    confidence: {
      score: 0.4,
      reason: 'No date pattern detected'
    }
  };
}

/**
 * Match child name from household context
 */
export function matchChildFromContext(
  text: string,
  household: HouseholdContext
): ExtractedChild | null {
  const normalizedText = normalizeText(text);

  for (const child of household.children) {
    // Check exact name match
    if (normalizedText.includes(normalizeText(child.name))) {
      return {
        raw: child.name,
        matchedId: child.id,
        matchedName: child.name,
        confidence: {
          score: 0.95,
          reason: `Exact match on child name: ${child.name}`
        }
      };
    }

    // Check nickname matches
    for (const nickname of child.nicknames) {
      if (normalizedText.includes(normalizeText(nickname))) {
        return {
          raw: nickname,
          matchedId: child.id,
          matchedName: child.name,
          confidence: {
            score: 0.85,
            reason: `Matched nickname: ${nickname} -> ${child.name}`
          }
        };
      }
    }
  }

  return null;
}

/**
 * Extract action from text (basic extraction without LLM)
 */
export function extractActionBasic(text: string): ExtractedAction {
  // Clean and normalize
  const cleaned = text.trim();

  // Try to identify verb (first word or after common prefixes)
  const words = cleaned.split(/\s+/);
  const verb = words.length > 0 ? words[0] : null;
  const object = words.length > 1 ? words.slice(1).join(' ') : null;

  return {
    raw: text,
    normalized: cleaned,
    verb,
    object,
    confidence: {
      score: 0.6,
      reason: 'Basic extraction without LLM'
    }
  };
}

// =============================================================================
// LLM EXTRACTION
// =============================================================================

/**
 * Format household context for LLM prompt
 */
function formatHouseholdContext(household: HouseholdContext): string {
  const childrenInfo = household.children
    .map(c => `- ${c.name} (${c.age} ans)${c.nicknames.length > 0 ? `, surnoms: ${c.nicknames.join(', ')}` : ''}`)
    .join('\n');

  const parentsInfo = household.parents
    .map(p => `- ${p.name} (${p.role})`)
    .join('\n');

  return `Enfants:\n${childrenInfo || 'Aucun enfant enregistré'}\n\nParents:\n${parentsInfo || 'Aucun parent enregistré'}`;
}

/**
 * LLM response schema for validation
 */
const LLMResponseSchema = z.object({
  action: z.object({
    raw: z.string(),
    normalized: z.string(),
    verb: z.string().nullable(),
    object: z.string().nullable()
  }),
  child: z.object({
    raw: z.string().nullable(),
    matchedName: z.string().nullable()
  }).nullable(),
  date: z.object({
    raw: z.string(),
    type: z.enum(['absolute', 'relative', 'recurring', 'none']),
    recurrence: z.string().optional()
  }),
  category: z.object({
    primary: TaskCategorySchema,
    secondary: TaskCategorySchema.nullable()
  }),
  urgency: z.object({
    level: UrgencyLevelSchema,
    indicators: z.array(z.string())
  }),
  assigneeSuggestion: z.string().nullable()
});

/**
 * Call LLM for semantic extraction (mock implementation)
 */
async function callLLM(
  text: string,
  language: SupportedLanguage,
  household: HouseholdContext,
  options: ExtractionOptions
): Promise<z.infer<typeof LLMResponseSchema>> {
  // In production, this would call OpenAI, Mistral, or Anthropic
  // For now, we return a mock response based on local extraction

  const category = detectCategoryFromKeywords(text, language);
  const urgency = detectUrgencyFromKeywords(text, language);
  const date = parseDateFromText(text, language);
  const child = matchChildFromContext(text, household);
  const action = extractActionBasic(text);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    action: {
      raw: action.raw,
      normalized: action.normalized,
      verb: action.verb,
      object: action.object
    },
    child: child ? {
      raw: child.raw,
      matchedName: child.matchedName
    } : null,
    date: {
      raw: date.raw,
      type: date.type,
      recurrence: date.recurrence
    },
    category: {
      primary: category.primary,
      secondary: category.secondary
    },
    urgency: {
      level: urgency.level,
      indicators: urgency.indicators
    },
    assigneeSuggestion: null
  };
}

/**
 * Extract semantic information using LLM
 */
export async function extractWithLLM(
  transcriptionId: string,
  text: string,
  language: SupportedLanguage,
  household: HouseholdContext,
  options: ExtractionOptions = { provider: 'openai', temperature: 0.1, maxTokens: 1000, timeout: 30000, retries: 2 }
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const id = generateId();
  const warnings: string[] = [];

  try {
    // Call LLM
    const llmResponse = await callLLM(text, language, household, options);

    // Validate response
    const validated = LLMResponseSchema.parse(llmResponse);

    // Enrich with local extraction for confidence scores
    const localCategory = detectCategoryFromKeywords(text, language);
    const localUrgency = detectUrgencyFromKeywords(text, language);
    const localDate = parseDateFromText(text, language);

    // Match child from household
    const matchedChild = validated.child?.matchedName
      ? household.children.find(c => c.name === validated.child?.matchedName)
      : null;

    // Calculate overall confidence
    const confidenceScores = [
      localCategory.confidence.score,
      localUrgency.confidence.score,
      localDate.confidence.score
    ];
    const overallConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;

    // Check for potential issues
    if (validated.child && !matchedChild) {
      warnings.push(`Child "${validated.child.raw}" mentioned but not found in household`);
    }

    if (localDate.type === 'none' && validated.date.type !== 'none') {
      warnings.push('Date extracted by LLM but not confirmed by local parsing');
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      id,
      transcriptionId,
      originalText: text,
      language,
      action: {
        raw: validated.action.raw,
        normalized: validated.action.normalized,
        verb: validated.action.verb,
        object: validated.action.object,
        confidence: {
          score: 0.8, // LLM extraction confidence
          reason: 'Extracted by LLM'
        }
      },
      child: matchedChild ? {
        raw: validated.child?.raw || '',
        matchedId: matchedChild.id,
        matchedName: matchedChild.name,
        confidence: {
          score: 0.9,
          reason: `Matched to household child: ${matchedChild.name}`
        }
      } : null,
      date: {
        raw: validated.date.raw || localDate.raw,
        parsed: localDate.parsed,
        type: validated.date.type,
        recurrence: validated.date.recurrence,
        confidence: localDate.confidence
      },
      category: {
        primary: validated.category.primary,
        secondary: validated.category.secondary,
        confidence: localCategory.confidence
      },
      urgency: {
        level: validated.urgency.level,
        indicators: validated.urgency.indicators,
        confidence: localUrgency.confidence
      },
      assigneeSuggestion: validated.assigneeSuggestion,
      overallConfidence,
      extractedAt: new Date(),
      processingTimeMs,
      llmModel: options.model || 'gpt-4',
      warnings
    };
  } catch (error) {
    // Fallback to local extraction
    warnings.push(`LLM extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    const localCategory = detectCategoryFromKeywords(text, language);
    const localUrgency = detectUrgencyFromKeywords(text, language);
    const localDate = parseDateFromText(text, language);
    const localChild = matchChildFromContext(text, household);
    const localAction = extractActionBasic(text);

    const processingTimeMs = Date.now() - startTime;

    return {
      id,
      transcriptionId,
      originalText: text,
      language,
      action: localAction,
      child: localChild,
      date: localDate,
      category: localCategory,
      urgency: localUrgency,
      assigneeSuggestion: null,
      overallConfidence: 0.5,
      extractedAt: new Date(),
      processingTimeMs,
      llmModel: 'local-fallback',
      warnings
    };
  }
}

// =============================================================================
// STORE OPERATIONS
// =============================================================================

/**
 * Start a new extraction
 */
export function startExtraction(
  store: ExtractionStore,
  transcriptionId: string
): ExtractionStore {
  const newPending = new Set(store.pendingExtractions);
  newPending.add(transcriptionId);

  return {
    ...store,
    pendingExtractions: newPending
  };
}

/**
 * Complete an extraction successfully
 */
export function completeExtraction(
  store: ExtractionStore,
  result: ExtractionResult
): ExtractionStore {
  const newExtractions = new Map(store.extractions);
  newExtractions.set(result.id, result);

  const newPending = new Set(store.pendingExtractions);
  newPending.delete(result.transcriptionId);

  // Update stats
  const totalExtractions = store.stats.totalExtractions + 1;
  const successfulExtractions = store.stats.successfulExtractions + 1;
  const newAvgConfidence = (store.stats.averageConfidence * store.stats.successfulExtractions + result.overallConfidence) / successfulExtractions;
  const newAvgProcessing = (store.stats.averageProcessingMs * store.stats.successfulExtractions + result.processingTimeMs) / successfulExtractions;

  return {
    ...store,
    extractions: newExtractions,
    pendingExtractions: newPending,
    stats: {
      ...store.stats,
      totalExtractions,
      successfulExtractions,
      averageConfidence: newAvgConfidence,
      averageProcessingMs: newAvgProcessing
    }
  };
}

/**
 * Mark an extraction as failed
 */
export function failExtraction(
  store: ExtractionStore,
  transcriptionId: string,
  error: string
): ExtractionStore {
  const newPending = new Set(store.pendingExtractions);
  newPending.delete(transcriptionId);

  const newFailed = new Map(store.failedExtractions);
  const existing = newFailed.get(transcriptionId);
  newFailed.set(transcriptionId, {
    error,
    attempts: (existing?.attempts || 0) + 1,
    lastAttempt: new Date()
  });

  return {
    ...store,
    pendingExtractions: newPending,
    failedExtractions: newFailed,
    stats: {
      ...store.stats,
      totalExtractions: store.stats.totalExtractions + 1,
      failedExtractions: store.stats.failedExtractions + 1
    }
  };
}

/**
 * Get extraction by ID
 */
export function getExtraction(
  store: ExtractionStore,
  extractionId: string
): ExtractionResult | undefined {
  return store.extractions.get(extractionId);
}

/**
 * Get extraction by transcription ID
 */
export function getExtractionByTranscription(
  store: ExtractionStore,
  transcriptionId: string
): ExtractionResult | undefined {
  for (const extraction of store.extractions.values()) {
    if (extraction.transcriptionId === transcriptionId) {
      return extraction;
    }
  }
  return undefined;
}

/**
 * Get all extractions with filtering
 */
export function getExtractions(
  store: ExtractionStore,
  filters?: {
    language?: SupportedLanguage;
    category?: TaskCategory;
    urgency?: UrgencyLevel;
    minConfidence?: number;
    hasChild?: boolean;
  }
): readonly ExtractionResult[] {
  let results = Array.from(store.extractions.values());

  if (filters) {
    if (filters.language) {
      results = results.filter(e => e.language === filters.language);
    }
    if (filters.category) {
      results = results.filter(e => e.category.primary === filters.category);
    }
    if (filters.urgency) {
      results = results.filter(e => e.urgency.level === filters.urgency);
    }
    if (filters.minConfidence !== undefined) {
      results = results.filter(e => e.overallConfidence >= filters.minConfidence!);
    }
    if (filters.hasChild !== undefined) {
      results = results.filter(e => (e.child !== null) === filters.hasChild);
    }
  }

  return results;
}

// =============================================================================
// MOCK EXTRACTION FOR TESTING
// =============================================================================

/**
 * Create a mock extraction result for testing
 */
export function createMockExtraction(
  transcriptionId: string,
  text: string,
  language: SupportedLanguage = 'fr',
  overrides?: Partial<ExtractionResult>
): ExtractionResult {
  const baseResult: ExtractionResult = {
    id: generateId(),
    transcriptionId,
    originalText: text,
    language,
    action: {
      raw: text,
      normalized: text.trim(),
      verb: 'faire',
      object: 'quelque chose',
      confidence: { score: 0.8, reason: 'Mock extraction' }
    },
    child: null,
    date: {
      raw: '',
      parsed: null,
      type: 'none',
      confidence: { score: 0.5, reason: 'No date detected' }
    },
    category: {
      primary: 'other',
      secondary: null,
      confidence: { score: 0.5, reason: 'Default category' }
    },
    urgency: {
      level: 'none',
      indicators: [],
      confidence: { score: 0.5, reason: 'No urgency detected' }
    },
    assigneeSuggestion: null,
    overallConfidence: 0.6,
    extractedAt: new Date(),
    processingTimeMs: 150,
    llmModel: 'mock',
    warnings: []
  };

  return { ...baseResult, ...overrides };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate extraction result quality
 */
export function validateExtractionQuality(
  result: ExtractionResult
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check overall confidence
  if (result.overallConfidence < 0.4) {
    issues.push('Overall confidence too low');
  }

  // Check action extraction
  if (!result.action.verb && !result.action.object) {
    issues.push('No action verb or object extracted');
  }

  // Check for warnings
  if (result.warnings.length > 2) {
    issues.push('Too many extraction warnings');
  }

  // Check processing time
  if (result.processingTimeMs > 10000) {
    issues.push('Processing took too long');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Get extraction quality score
 */
export function getExtractionQualityScore(result: ExtractionResult): number {
  let score = result.overallConfidence;

  // Bonus for having extracted child
  if (result.child && result.child.matchedId) {
    score += 0.1;
  }

  // Bonus for having extracted date
  if (result.date.parsed) {
    score += 0.1;
  }

  // Bonus for having verb and object
  if (result.action.verb && result.action.object) {
    score += 0.1;
  }

  // Penalty for warnings
  score -= result.warnings.length * 0.05;

  return Math.max(0, Math.min(1, score));
}
