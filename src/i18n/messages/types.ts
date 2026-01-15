/**
 * Type definitions for i18n messages
 *
 * Provides type safety for all translations.
 */

export interface Messages {
  common: CommonMessages
  auth: AuthMessages
  nav: NavMessages
  dashboard: DashboardMessages
  tasks: TaskMessages
  children: ChildrenMessages
  charge: ChargeMessages
  settings: SettingsMessages
  onboarding: OnboardingMessages
  errors: ErrorMessages
  time: TimeMessages
  voice: VoiceMessages
  offline: OfflineMessages
  accessibility: AccessibilityMessages
}

export interface CommonMessages {
  loading: string
  save: string
  cancel: string
  delete: string
  edit: string
  add: string
  back: string
  next: string
  previous: string
  search: string
  filter: string
  export: string
  import: string
  yes: string
  no: string
  confirm: string
  error: string
  success: string
  warning: string
  close: string
  create: string
  update: string
  view: string
  download: string
  upload: string
  copy: string
  share: string
  print: string
  refresh: string
  retry: string
  skip: string
  done: string
  apply: string
  reset: string
  clear: string
  selectAll: string
  deselectAll: string
  more: string
  less: string
  showMore: string
  showLess: string
  seeAll: string
  optional: string
  required: string
}

export interface AuthMessages {
  login: string
  logout: string
  signup: string
  email: string
  password: string
  confirmPassword: string
  forgotPassword: string
  resetPassword: string
  loginWithGoogle: string
  loginWithApple: string
  noAccount: string
  haveAccount: string
  unauthorized: string
  sessionExpired: string
  invalidCredentials: string
  emailNotVerified: string
  accountLocked: string
  passwordRequirements: string
  termsAgree: string
  welcomeBack: string
  createAccount: string
  verifyEmail: string
  checkEmail: string
  resendVerification: string
  passwordChanged: string
  passwordResetSent: string
  newPassword: string
  currentPassword: string
}

export interface NavMessages {
  dashboard: string
  tasks: string
  children: string
  charge: string
  settings: string
  profile: string
  household: string
  notifications: string
  billing: string
  templates: string
  calendar: string
  statistics: string
  help: string
  feedback: string
  about: string
  privacy: string
  terms: string
  home: string
}

export interface DashboardMessages {
  title: string
  welcome: string
  welcomeMessage: string
  todayTasks: string
  weekTasks: string
  overdueTasks: string
  completedTasks: string
  upcomingTasks: string
  streak: string
  streakDays: string
  streakMessage: string
  noTasks: string
  addTask: string
  quickAdd: string
  recentActivity: string
  mentalLoadScore: string
  balanceIndicator: string
  tasksCompleted: string
  pendingTasks: string
  goodJob: string
  keepItUp: string
  needsAttention: string
  allCaughtUp: string
  noOverdue: string
  summary: string
  insights: string
  tips: string
}

export interface TaskStatusMessages {
  pending: string
  done: string
  reported: string
  cancelled: string
  inProgress: string
}

export interface TaskPriorityMessages {
  low: string
  normal: string
  high: string
  critical: string
}

export interface TaskCategoryMessages {
  administratif: string
  sante: string
  ecole: string
  quotidien: string
  social: string
  activites: string
  logistique: string
  finances: string
  medical: string
  education: string
  transport: string
  shopping: string
  household: string
  other: string
}

export interface PostponeOptionsMessages {
  oneDay: string
  threeDays: string
  oneWeek: string
  custom: string
}

export interface RecurringOptionsMessages {
  daily: string
  weekly: string
  biweekly: string
  monthly: string
  yearly: string
  custom: string
}

export interface SortOptionsMessages {
  deadline: string
  priority: string
  category: string
  created: string
  updated: string
}

export interface TaskMessages {
  title: string
  newTask: string
  editTask: string
  deleteTask: string
  taskTitle: string
  description: string
  deadline: string
  priority: string
  category: string
  assignTo: string
  assignedTo: string
  child: string
  children: string
  status: TaskStatusMessages
  priorityLevels: TaskPriorityMessages
  categories: TaskCategoryMessages
  markAsDone: string
  markAsPending: string
  postpone: string
  postponeBy: string
  postponeOptions: PostponeOptionsMessages
  vocal: string
  vocalRecording: string
  vocalProcessing: string
  recurring: string
  recurringPattern: string
  recurringOptions: RecurringOptionsMessages
  today: string
  thisWeek: string
  nextWeek: string
  thisMonth: string
  overdue: string
  all: string
  noTasks: string
  noTasksMessage: string
  createFirst: string
  taskCreated: string
  taskUpdated: string
  taskDeleted: string
  taskCompleted: string
  confirmDelete: string
  filters: string
  sortBy: string
  sortOptions: SortOptionsMessages
  weight: string
  weightInfo: string
  attachments: string
  notes: string
  reminders: string
  addReminder: string
  dueToday: string
  dueTomorrow: string
  dueThisWeek: string
  noDueDate: string
  setDeadline: string
  clearDeadline: string
  unassigned: string
  assignToMe: string
  reassign: string
  duplicate: string
  archive: string
  restore: string
}

export interface GenderOptionsMessages {
  male: string
  female: string
  other: string
  preferNotToSay: string
}

export interface SchoolLevelsMessages {
  nursery: string
  preschool: string
  elementary: string
  middle: string
  high: string
  college: string
  other: string
}

export interface ChildrenMessages {
  title: string
  addChild: string
  editChild: string
  deleteChild: string
  firstName: string
  lastName: string
  nickname: string
  birthdate: string
  gender: string
  genderOptions: GenderOptionsMessages
  school: string
  schoolName: string
  schoolLevel: string
  schoolLevels: SchoolLevelsMessages
  schoolClass: string
  grade: string
  tags: string
  addTag: string
  timeline: string
  milestones: string
  noChildren: string
  noChildrenMessage: string
  age: string
  ageMonths: string
  vaccinations: string
  medicalInfo: string
  allergies: string
  medications: string
  emergencyContact: string
  doctor: string
  bloodType: string
  notes: string
  activities: string
  schedule: string
  documents: string
  photos: string
  childCreated: string
  childUpdated: string
  childDeleted: string
  confirmDelete: string
  profile: string
  stats: string
  tasksRelated: string
}

export interface ChargeTipsMessages {
  title: string
  tip1Title: string
  tip1Desc: string
  tip2Title: string
  tip2Desc: string
  tip3Title: string
  tip3Desc: string
  tip4Title: string
  tip4Desc: string
  tip5Title: string
  tip5Desc: string
}

export interface ChargeMessages {
  title: string
  subtitle: string
  totalLoad: string
  loadPoints: string
  distribution: string
  balanced: string
  unbalanced: string
  byCategory: string
  byParent: string
  byChild: string
  history: string
  thisWeek: string
  lastWeek: string
  weeksAgo: string
  monthsAgo: string
  exportPdf: string
  exportCsv: string
  tips: ChargeTipsMessages
  score: string
  scoreExcellent: string
  scoreGood: string
  scoreFair: string
  scorePoor: string
  scoreVeryPoor: string
  improvement: string
  decline: string
  noChange: string
  vsLastWeek: string
  vsLastMonth: string
  tasksByPerson: string
  weightByPerson: string
  recommendations: string
  viewDetails: string
  compareWith: string
  trend: string
  average: string
  peak: string
  yourLoad: string
  partnerLoad: string
  sharedLoad: string
}

export interface ProfileSettingsMessages {
  title: string
  description: string
  displayName: string
  email: string
  phone: string
  avatar: string
  changeAvatar: string
  removeAvatar: string
  timezone: string
  language: string
  saveChanges: string
  profileUpdated: string
}

export interface RolesMessages {
  admin: string
  member: string
  viewer: string
}

export interface InviteMessages {
  title: string
  description: string
  email: string
  send: string
  sent: string
  pending: string
  resend: string
  cancel: string
  expired: string
  accepted: string
}

export interface HouseholdSettingsMessages {
  title: string
  description: string
  householdName: string
  members: string
  inviteMember: string
  removeMember: string
  leaveHousehold: string
  deleteHousehold: string
  role: string
  roles: RolesMessages
  invite: InviteMessages
  confirmLeave: string
  confirmDelete: string
  householdUpdated: string
  memberRemoved: string
}

export interface NotificationSettingsMessages {
  title: string
  description: string
  channels: string
  pushEnabled: string
  pushDescription: string
  emailEnabled: string
  emailDescription: string
  smsEnabled: string
  smsDescription: string
  dailyReminder: string
  dailyReminderTime: string
  beforeDeadline: string
  beforeDeadlineHours: string
  weeklySummary: string
  weeklySummaryDay: string
  balanceAlert: string
  balanceAlertThreshold: string
  testPush: string
  testSent: string
  quietHours: string
  quietHoursStart: string
  quietHoursEnd: string
  sound: string
  vibration: string
  notificationsSaved: string
}

export interface PlansMessages {
  free: string
  basic: string
  premium: string
  family: string
}

export interface BillingSettingsMessages {
  title: string
  description: string
  currentPlan: string
  plans: PlansMessages
  trial: string
  trialEnds: string
  active: string
  cancelled: string
  expired: string
  pastDue: string
  manageBilling: string
  upgrade: string
  downgrade: string
  cancel: string
  reactivate: string
  paymentMethod: string
  addPaymentMethod: string
  updatePaymentMethod: string
  billingHistory: string
  nextPayment: string
  invoices: string
  downloadInvoice: string
  features: string
  comparePlans: string
  subscriptionUpdated: string
  paymentFailed: string
  contactSupport: string
}

export interface LanguageNamesMessages {
  fr: string
  en: string
  es: string
  de: string
}

export interface LanguageSettingsMessages {
  title: string
  description: string
  selectLanguage: string
  languages: LanguageNamesMessages
  languageChanged: string
}

export interface PrivacySettingsMessages {
  title: string
  description: string
  dataExport: string
  dataExportDescription: string
  deleteAccount: string
  deleteAccountDescription: string
  analytics: string
  analyticsDescription: string
  confirmDelete: string
  accountDeleted: string
  dataExported: string
}

export interface ThemesMessages {
  light: string
  dark: string
  system: string
}

export interface FontSizesMessages {
  small: string
  medium: string
  large: string
}

export interface AppearanceSettingsMessages {
  title: string
  description: string
  theme: string
  themes: ThemesMessages
  fontSize: string
  fontSizes: FontSizesMessages
  compactMode: string
  animations: string
}

export interface SecuritySettingsMessages {
  title: string
  description: string
  changePassword: string
  twoFactor: string
  twoFactorEnabled: string
  twoFactorDisabled: string
  enable2FA: string
  disable2FA: string
  sessions: string
  logoutAll: string
  lastLogin: string
  securityLog: string
}

export interface SettingsMessages {
  title: string
  profile: ProfileSettingsMessages
  household: HouseholdSettingsMessages
  notifications: NotificationSettingsMessages
  billing: BillingSettingsMessages
  language: LanguageSettingsMessages
  privacy: PrivacySettingsMessages
  appearance: AppearanceSettingsMessages
  security: SecuritySettingsMessages
}

export interface OnboardingStepsMessages {
  welcome: string
  household: string
  children: string
  templates: string
  finish: string
}

export interface OnboardingMessages {
  title: string
  subtitle: string
  steps: OnboardingStepsMessages
  welcomeMessage: string
  welcomeDescription: string
  createHousehold: string
  householdNamePlaceholder: string
  addChildren: string
  addChildrenDescription: string
  selectTemplates: string
  selectTemplatesDescription: string
  allSet: string
  allSetDescription: string
  letsGo: string
  skipStep: string
  finishLater: string
  progress: string
}

export interface ErrorMessages {
  generic: string
  genericMessage: string
  notFound: string
  notFoundMessage: string
  networkError: string
  networkErrorMessage: string
  unauthorized: string
  forbidden: string
  serverError: string
  serverErrorMessage: string
  validation: string
  timeout: string
  offline: string
  offlineMessage: string
  syncFailed: string
  syncFailedMessage: string
  rateLimited: string
  rateLimitedMessage: string
  sessionExpired: string
  loginRequired: string
  permissionDenied: string
  invalidInput: string
  required: string
  tooShort: string
  tooLong: string
  invalidEmail: string
  invalidPassword: string
  passwordMismatch: string
  goHome: string
  tryAgain: string
  contactSupport: string
}

export interface WeekdaysMessages {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

export interface MonthsMessages {
  january: string
  february: string
  march: string
  april: string
  may: string
  june: string
  july: string
  august: string
  september: string
  october: string
  november: string
  december: string
}

export interface TimeMessages {
  today: string
  tomorrow: string
  yesterday: string
  thisWeek: string
  lastWeek: string
  nextWeek: string
  thisMonth: string
  lastMonth: string
  nextMonth: string
  thisYear: string
  daysAgo: string
  weeksAgo: string
  monthsAgo: string
  yearsAgo: string
  inDays: string
  inWeeks: string
  inMonths: string
  hoursAgo: string
  minutesAgo: string
  justNow: string
  seconds: string
  minutes: string
  hours: string
  days: string
  weeks: string
  months: string
  years: string
  morning: string
  afternoon: string
  evening: string
  night: string
  weekdays: WeekdaysMessages
  weekdaysShort: WeekdaysMessages
  months: MonthsMessages
  monthsShort: MonthsMessages
}

export interface VoiceMessages {
  title: string
  instruction: string
  recording: string
  processing: string
  tapToRecord: string
  tapToStop: string
  holdToRecord: string
  releaseToStop: string
  permissionDenied: string
  permissionDeniedMessage: string
  error: string
  errorMessage: string
  preview: string
  confirm: string
  retry: string
  suggestions: string
  example1: string
  example2: string
  example3: string
}

export interface OfflineMessages {
  title: string
  message: string
  pendingChanges: string
  syncing: string
  synced: string
  syncError: string
  lastSynced: string
}

export interface AccessibilityMessages {
  skipToContent: string
  menu: string
  closeMenu: string
  openMenu: string
  loading: string
  selected: string
  notSelected: string
  expanded: string
  collapsed: string
  required: string
  optional: string
  error: string
  success: string
  info: string
  warning: string
  close: string
  open: string
  previous: string
  next: string
  goBack: string
  currentPage: string
  page: string
  of: string
}

export type MessageKey = keyof Messages
export type Locale = "fr" | "en" | "es" | "de"
