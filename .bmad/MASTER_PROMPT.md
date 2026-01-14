# MASTER PROMPT - FamilyLoad

## VISION PRODUIT (NON NÉGOCIABLE)

**FamilyLoad** est un assistant de charge mentale familiale mondial.

### CE QUE LE PRODUIT EST:
- 🌍 Mondial (multi-langues, multi-cultures)
- 📱 Mobile-first (iOS / Android via Flutter)
- 🌐 Web SaaS complémentaire (Next.js)
- 🎙️ Vocal-native (dictée → tâche automatique)
- 🧠 Zero-config (le système pense à la place des parents)
- ⚖️ Orienté justice parentale (répartition équitable)
- 🔁 Addictif par soulagement + continuité

### CE QUE LE PRODUIT N'EST PAS:
- ❌ Un planner / todo list
- ❌ Une app d'organisation
- ❌ Un outil qui demande "que voulez-vous faire ?"

### PHRASE CLÉ:
> "Dis ce que tu dois faire. On s'en souvient. On te le rappelle. On le répartit."

---

## CONCEPT CENTRAL (CORE LOOP)

1. L'enfant existe
2. L'enfant génère automatiquement des obligations
3. L'app les connaît (catalogue automatique)
4. L'app les répartit entre parents
5. L'app rappelle au bon moment
6. Le parent valide (swipe)
7. Streak / continuité

---

## UTILISATEURS

### Rôles
- **Parent principal** - créateur du foyer
- **Co-parent** - invité, mêmes droits
- **Tiers** (v2) - nounou, grand-parent

### Attributs utilisateur
- id, email, auth_provider
- langue, timezone
- rôle, device_tokens
- préférences notifications

---

## FOYER

- Nom du foyer
- Pays (règles culturelles)
- Timezone maître
- Streak courant
- Abonnement (4€/mois)

---

## ENFANTS

### Attributs
- Prénom
- Date de naissance (calcul âge automatique)
- École / structure
- Niveau scolaire
- Tags spécifiques (allergies, PAP, etc.)
- Historique

### Règle critique:
> L'âge de l'enfant déclenche automatiquement des tâches.

---

## TÂCHES (CŒUR DU PRODUIT)

### Types de tâches
1. **Automatiques** - générées par le catalogue selon âge/période
2. **Vocales** - dictées par le parent
3. **Manuelles** - exception rare

### Attributs tâche
- enfant_id
- catégorie, sous-catégorie
- description
- deadline (flexible ou non)
- priorité calculée
- assigné_à (user_id)
- statut (à_faire / fait / reporté / annulé)
- source (auto / vocal / manuel)
- poids_charge (int pour calcul répartition)
- récurrence (JSON)

### Catégories universelles
| Catégorie | Exemples |
|-----------|----------|
| École | Inscription, fournitures, réunions, sorties |
| Santé | Vaccins, médecin, dentiste, ordonnances |
| Administratif | Papiers, assurance, CAF, impôts |
| Quotidien | Repas, vêtements, courses |
| Social | Anniversaires, cadeaux, invitations |
| Activités | Sport, musique, inscriptions |
| Logistique | Transport, garde, vacances |

---

## 🎙️ FONCTIONNALITÉ VOCALE (DIFFÉRENCIATEUR)

### UX
- Bouton micro persistant partout
- Enregistrement max 30s
- Feedback visuel
- Confirmation silencieuse

### Pipeline technique
1. **Capture audio** (mobile natif)
2. **Upload sécurisé**
3. **Speech-to-Text** (Whisper / Deepgram)
4. **Normalisation texte**
5. **Analyse sémantique LLM**
6. **Extraction champs**:
   - action
   - enfant concerné
   - date implicite/explicite
   - catégorie
7. **Scoring confiance**
8. **Création tâche automatique**
9. **Notification confirmation**

### Exemple
```
🎙️ "Il faut que je renvoie le papier de sortie scolaire pour Emma"

🎯 Résultat:
- Enfant: Emma
- Type: École
- Action: Renvoyer autorisation
- Deadline: +3 jours
- Assigné: Parent le moins chargé
```

### Prompt sémantique
```
Tu es un assistant de charge mentale familiale.
À partir de ce texte, extrais en JSON:
- action: string
- enfant: string | null
- date: string | null
- categorie: string
- urgence: "haute" | "normale" | "basse"
```

---

## 🧠 CATALOGUE AUTOMATIQUE (OR MASSIF)

### Structure task_templates
- id, pays
- âge_min, âge_max
- catégorie
- description
- règle_périodique (cron)
- poids_charge
- délai_avant_deadline

### Règles par âge

#### 0-3 ans
- Vaccins obligatoires
- Visites PMI
- Mode de garde

#### 3-6 ans (maternelle)
- Inscription école
- Assurance scolaire
- Réunions rentrée
- Photos classe
- Fête école

#### 6-11 ans (primaire)
- Fournitures scolaires
- Cantine
- Études/garderie
- Sorties scolaires
- Classe verte

#### 11-15 ans (collège)
- Orientation
- Brevet
- Activités ados

#### 15-18 ans (lycée)
- Permis
- Bac
- Parcoursup

### Règles par période
| Période | Tâches générées |
|---------|-----------------|
| Septembre | Rentrée, assurance, fournitures |
| Octobre | Réunion parents-profs |
| Décembre | Cadeaux, vacances |
| Janvier | Inscriptions activités |
| Juin | Fin d'année, réinscriptions |

---

## ⚖️ MOTEUR DE RÉPARTITION

### Calcul charge
```
Charge parent = Σ (poids_charge × tâches réalisées)
```

### Poids par type
| Type | Poids |
|------|-------|
| Papier administratif | 3 |
| Rendez-vous médical | 5 |
| Réunion école | 4 |
| Course quotidienne | 1 |
| Organisation anniversaire | 6 |

### Règles d'assignation
1. Parent le moins chargé cette semaine
2. Rotation si égalité
3. Exclusion temporaire possible (fatigue, voyage)
4. Ajustement manuel autorisé

### Alertes
- Déséquilibre > 60/40
- Surcharge hebdomadaire
- Inactivité d'un parent

### Message UX (jamais culpabilisant)
> "Cette semaine, tu portes 64% de la charge familiale."

---

## 🔁 STREAK & ADDICTION DOUCE

### Mécaniques
- ✅ Validation quotidienne (swipe)
- 🔢 Streak foyer ("X jours sans oubli")
- 😬 Peur de la rupture
- ⚖️ Justice perçue

### Règles streak
- +1 si toutes tâches critiques du jour = faites
- Rupture si tâche critique oubliée
- "Joker" (premium) pour sauver 1 streak/mois

---

## 📱 APPLICATION MOBILE

### Écran 1 - Aujourd'hui (HOME)
- Liste ultra courte
- Code couleur priorité
- Actions: Fait / Reporté / Déléguer

### Écran 2 - Cette semaine
- Vue 7 jours
- Alertes accumulation

### Écran 3 - Enfants
- Timeline par enfant
- Historique

### Écran 4 - Charge mentale
- % par parent
- Graphique semaine
- Alertes

### Écran 5 - Paramètres
- Foyer, enfants, notifications
- Paiement, export PDF

---

## 🌐 WEB SAAS

### Pages
1. Landing (problème, solution, pricing)
2. Auth (email, magic link, Google/Apple)
3. Onboarding (foyer, enfants, co-parent)
4. Dashboard (vue large)
5. Paramètres
6. Paiement (Stripe)

---

## 💰 MONÉTISATION

- **Prix**: 4€/mois/foyer
- **Essai**: 14 jours gratuit
- **Paiement**: Stripe (web) + IAP (mobile)

---

## 🧱 STACK TECHNIQUE

| Layer | Tech |
|-------|------|
| Mobile | Flutter |
| Web | Next.js 15 |
| Backend | NestJS |
| Database | PostgreSQL (Supabase) |
| Cache | Redis |
| Auth | Supabase Auth + Cognito |
| STT | Whisper API |
| LLM | GPT-4 / Mistral |
| Notifications | Firebase + APNs |
| Paiement | Stripe + IAP |
| Storage | S3 |

---

## 🔐 SÉCURITÉ & RGPD

- Chiffrement données sensibles
- Isolation foyers (RLS)
- Suppression compte complète
- Export données (RGPD)
- Pas de diagnostic médical
- Logs anonymisés

---

## 🎯 MÉTRIQUES SUCCÈS

- Rétention J7 > 60%
- Streak moyen > 5 jours
- NPS > 50
- Charge équilibrée < 55/45

---

## MESSAGE FINAL

> Le parent doit se dire: "Heureusement que l'app existe, j'aurais oublié."

Chaque ligne de code doit servir cet objectif.
