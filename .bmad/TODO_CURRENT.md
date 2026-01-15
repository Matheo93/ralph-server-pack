# TODO CURRENT - Sprint 21: Vocal Pipeline & Automatic Task Catalog

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ECRIS DU CODE REEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIEGES A EVITER**

---

## Sprint Goal
Sprint 20 a couvert push notifications, Stripe subscriptions, smart reminders, family insights, onboarding.
Sprint 21 se concentre sur le DIFFERENCIATEUR CORE du produit:
- 🎙️ Voice-to-Task pipeline (STT + LLM semantic extraction)
- 🧠 Automatic task catalog (age-based generation)
- ⚖️ Advanced load distribution engine
- 🔁 Streak system with gamification
- 📊 Family justice metrics

---

## PRE-REQUIS
- [ ] 0.1 Verifier que le build passe: `bunx tsc --noEmit && bun run build`
- [ ] 0.2 Verifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Voice-to-Task Pipeline

- [ ] 1.1 Creer `src/lib/voice/audio-processor.ts`:
  - Audio format validation (wav, mp3, m4a)
  - Duration limit enforcement (30s max)
  - Audio normalization
  - Chunked upload handling

- [ ] 1.2 Creer `src/lib/voice/speech-to-text.ts`:
  - Whisper API integration
  - Deepgram fallback
  - Multi-language support (FR, EN, ES, DE)
  - Confidence scoring
  - Transcription caching

- [ ] 1.3 Creer `src/lib/voice/semantic-extractor.ts`:
  - LLM-based extraction (GPT-4/Mistral)
  - Field extraction: action, child, date, category, urgency
  - Prompt templates per language
  - Validation and sanitization
  - Confidence scoring per field

- [ ] 1.4 Creer `src/lib/voice/task-generator.ts`:
  - Voice transcription to task conversion
  - Child matching from household
  - Deadline inference
  - Category auto-detection
  - Assignee suggestion

- [ ] 1.5 Creer `src/app/api/voice/route.ts`:
  - Upload audio endpoint
  - Process transcription endpoint
  - Get task preview endpoint
  - Confirm task creation endpoint

- [ ] 1.6 Tests voice pipeline (40+ tests):
  - Audio processing tests
  - STT integration tests
  - Semantic extraction tests
  - Task generation tests

---

## Phase 2: Automatic Task Catalog

- [ ] 2.1 Creer `src/lib/catalog/task-templates.ts`:
  - Template schema with age ranges
  - Country-specific templates
  - Category mapping
  - Charge weight definitions
  - Recurrence patterns

- [ ] 2.2 Creer `src/lib/catalog/age-rules.ts`:
  - Age-based task triggers:
    - 0-3 (vaccines, PMI visits)
    - 3-6 (maternelle enrollment)
    - 6-11 (primaire supplies)
    - 11-15 (college orientation)
    - 15-18 (permis, bac, parcoursup)

- [ ] 2.3 Creer `src/lib/catalog/period-rules.ts`:
  - Seasonal task generation:
    - September (rentree, assurance)
    - October (reunions parents-profs)
    - December (cadeaux, vacances)
    - January (inscriptions activites)
    - June (fin d'annee)

- [ ] 2.4 Creer `src/lib/catalog/task-generator-auto.ts`:
  - Automatic task generation from catalog
  - Child age monitoring
  - Period-based triggering
  - Duplicate prevention
  - Notification on new tasks

- [ ] 2.5 Creer `src/app/api/catalog/route.ts`:
  - Get templates endpoint
  - Generate tasks for child endpoint
  - Get upcoming auto-tasks endpoint
  - Dismiss auto-task endpoint

- [ ] 2.6 Tests catalog (30+ tests):
  - Template validation tests
  - Age rule tests
  - Period rule tests
  - Auto-generation tests

---

## Phase 3: Advanced Load Distribution

- [ ] 3.1 Creer `src/lib/distribution/load-calculator-v2.ts`:
  - Enhanced load calculation formula
  - Category weight multipliers
  - Time-weighted scoring
  - Historical load tracking
  - Fatigue factor integration

- [ ] 3.2 Creer `src/lib/distribution/assignment-optimizer.ts`:
  - Optimal assignee selection
  - Workload balancing algorithm
  - Rotation enforcement
  - Exclusion period handling
  - Override capability

- [ ] 3.3 Creer `src/lib/distribution/balance-alerts.ts`:
  - Imbalance detection (>60/40)
  - Weekly overload alerts
  - Inactivity detection
  - Trend analysis
  - Non-culpabilizing messaging

- [ ] 3.4 Creer `src/app/api/distribution/route.ts`:
  - Get load distribution endpoint
  - Get balance status endpoint
  - Set exclusion period endpoint
  - Manual reassignment endpoint

- [ ] 3.5 Tests distribution (25+ tests):
  - Load calculation tests
  - Assignment optimization tests
  - Balance alert tests
  - Exclusion handling tests

---

## Phase 4: Streak & Gamification System

- [ ] 4.1 Creer `src/lib/gamification/streak-engine.ts`:
  - Daily streak tracking
  - Critical task completion validation
  - Streak break detection
  - Recovery mechanics
  - Household streak aggregation

- [ ] 4.2 Creer `src/lib/gamification/joker-system.ts`:
  - Joker token management (premium)
  - Monthly joker allocation
  - Streak save mechanism
  - Joker history tracking

- [ ] 4.3 Creer `src/lib/gamification/achievements.ts`:
  - Achievement definitions
  - Progress tracking
  - Unlock notifications
  - Badge display

- [ ] 4.4 Creer `src/lib/gamification/leaderboard.ts`:
  - Family leaderboard
  - Weekly/monthly rankings
  - Fair comparison metrics
  - Anonymized global stats

- [ ] 4.5 Creer `src/app/api/gamification/route.ts`:
  - Get streak status endpoint
  - Use joker endpoint
  - Get achievements endpoint
  - Get leaderboard endpoint

- [ ] 4.6 Tests gamification (30+ tests):
  - Streak calculation tests
  - Joker system tests
  - Achievement tests
  - Leaderboard tests

---

## Phase 5: Family Justice Metrics

- [ ] 5.1 Creer `src/lib/justice/fairness-calculator.ts`:
  - Weekly charge percentage per parent
  - Historical fairness trends
  - Category-based fairness
  - Adjustments for exclusions

- [ ] 5.2 Creer `src/lib/justice/messaging-engine.ts`:
  - Non-culpabilizing message templates
  - Positive reinforcement
  - Balance improvement suggestions
  - Weekly summary generation

- [ ] 5.3 Creer `src/lib/justice/report-generator.ts`:
  - Weekly family report
  - Monthly summary
  - PDF export
  - Email delivery

- [ ] 5.4 Creer `src/app/api/justice/route.ts`:
  - Get fairness metrics endpoint
  - Get weekly report endpoint
  - Export report endpoint
  - Get improvement tips endpoint

- [ ] 5.5 Tests justice (25+ tests):
  - Fairness calculation tests
  - Message generation tests
  - Report generation tests
  - Export tests

---

## Definition of Done Sprint 21
- [ ] Voice: Complete voice-to-task pipeline (STT + LLM)
- [ ] Catalog: Age-based automatic task generation
- [ ] Distribution: Advanced load balancing with alerts
- [ ] Gamification: Streak system with jokers and achievements
- [ ] Justice: Family fairness metrics and reports
- [ ] Build production OK: `bunx tsc --noEmit && bun run build`
- [ ] Tous les tests passent: `bun test src/tests/`
- [ ] 150+ nouveaux tests (40 voice + 30 catalog + 25 distribution + 30 gamification + 25 justice)

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINE:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Cree un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRETE JAMAIS - boucle infinie de sprints
