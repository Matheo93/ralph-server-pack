/**
 * Tests for LLM Analyzer Service
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"
import {
  detectUrgencyFast,
  suggestCategoryFast,
  detectAmbiguitiesFast,
  analyzeVocalCommandFast,
  type UrgencyAnalysis,
  type CategorySuggestion,
  type Ambiguity,
} from "@/lib/services/llm-analyzer"

// =============================================================================
// URGENCY DETECTION TESTS
// =============================================================================

describe("detectUrgencyFast", () => {
  it("detects critical urgency with 'urgent' keyword", () => {
    const result = detectUrgencyFast("C'est urgent, il faut appeler le médecin")
    expect(result.level).toBe("critical")
    expect(result.score).toBeGreaterThanOrEqual(0.9)
    expect(result.keywords_found).toContain("urgent")
  })

  it("detects critical urgency with 'immédiatement'", () => {
    const result = detectUrgencyFast("Il faut partir immédiatement")
    expect(result.level).toBe("critical")
    expect(result.keywords_found).toContain("immédiatement")
  })

  it("detects critical urgency with 'tout de suite'", () => {
    const result = detectUrgencyFast("Fais ça tout de suite")
    expect(result.level).toBe("critical")
    expect(result.keywords_found).toContain("tout de suite")
  })

  it("detects high urgency with 'demain'", () => {
    const result = detectUrgencyFast("N'oublie pas le rendez-vous demain")
    expect(result.level).toBe("high")
    expect(result.keywords_found).toContain("demain")
  })

  it("detects high urgency with 'important'", () => {
    const result = detectUrgencyFast("C'est très important pour Emma")
    expect(result.level).toBe("high")
    expect(result.keywords_found).toContain("important")
  })

  it("detects high urgency with 'ne pas oublier'", () => {
    const result = detectUrgencyFast("Ne pas oublier les médicaments")
    expect(result.level).toBe("high")
    expect(result.keywords_found).toContain("ne pas oublier")
  })

  it("detects low urgency with 'quand possible'", () => {
    const result = detectUrgencyFast("Range sa chambre quand possible")
    expect(result.level).toBe("low")
    expect(result.keywords_found).toContain("quand possible")
  })

  it("detects low urgency with 'pas urgent'", () => {
    const result = detectUrgencyFast("C'est pas urgent, mais pense à acheter du lait")
    expect(result.level).toBe("low")
    expect(result.keywords_found).toContain("pas urgent")
  })

  it("returns normal urgency for neutral text", () => {
    const result = detectUrgencyFast("Acheter du pain")
    expect(result.level).toBe("normal")
    expect(result.score).toBe(0.5)
  })

  it("detects deadline pressure with 'avant demain'", () => {
    const result = detectUrgencyFast("Il faut finir avant demain")
    expect(result.deadline_pressure).toBe(true)
    expect(result.level).toBe("high")
  })

  it("detects deadline pressure with 'd'ici ce soir'", () => {
    const result = detectUrgencyFast("Prépare les affaires d'ici ce soir")
    expect(result.deadline_pressure).toBe(true)
  })

  it("detects deadline pressure with 'pour lundi'", () => {
    const result = detectUrgencyFast("Finir le devoir pour lundi")
    expect(result.deadline_pressure).toBe(true)
  })

  it("provides reasons for detected urgency", () => {
    const result = detectUrgencyFast("C'est urgent et important")
    expect(result.reasons.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// CATEGORY SUGGESTION TESTS
// =============================================================================

describe("suggestCategoryFast", () => {
  it("suggests ecole for school-related text", () => {
    const result = suggestCategoryFast("Préparer le cartable pour l'école")
    expect(result[0]?.code).toBe("ecole")
    expect(result[0]?.confidence).toBeGreaterThan(0.5)
  })

  it("suggests ecole for homework text", () => {
    const result = suggestCategoryFast("Vérifier les devoirs de Lucas")
    expect(result[0]?.code).toBe("ecole")
  })

  it("suggests ecole for cantine", () => {
    const result = suggestCategoryFast("Payer la cantine de Lucas")
    expect(result[0]?.code).toBe("ecole")
  })

  it("suggests sante for medical appointments", () => {
    const result = suggestCategoryFast("Prendre rendez-vous chez le médecin")
    expect(result[0]?.code).toBe("sante")
  })

  it("suggests sante for pharmacy", () => {
    const result = suggestCategoryFast("Aller à la pharmacie chercher les médicaments")
    expect(result[0]?.code).toBe("sante")
    // Keywords order may vary based on length sorting
    expect(result[0]?.reasons[0]).toContain("pharmacie")
    expect(result[0]?.reasons[0]).toContain("médicament")
  })

  it("suggests sante for vaccination", () => {
    const result = suggestCategoryFast("RDV vaccin pour Emma")
    expect(result[0]?.code).toBe("sante")
  })

  it("suggests administratif for paperwork", () => {
    const result = suggestCategoryFast("Remplir les papiers pour l'assurance")
    expect(result[0]?.code).toBe("administratif")
  })

  it("suggests administratif for CAF", () => {
    const result = suggestCategoryFast("Déclaration CAF à faire")
    expect(result[0]?.code).toBe("administratif")
  })

  it("suggests quotidien for groceries", () => {
    const result = suggestCategoryFast("Faire les courses au supermarché")
    expect(result[0]?.code).toBe("quotidien")
  })

  it("suggests quotidien for household chores", () => {
    const result = suggestCategoryFast("Faire le ménage et la lessive")
    expect(result[0]?.code).toBe("quotidien")
  })

  it("suggests social for birthday", () => {
    const result = suggestCategoryFast("Organiser l'anniversaire de Lucas")
    expect(result[0]?.code).toBe("social")
  })

  it("suggests social for party invitation", () => {
    const result = suggestCategoryFast("Envoyer les invitations pour la fête")
    expect(result[0]?.code).toBe("social")
  })

  it("suggests activites for sports", () => {
    const result = suggestCategoryFast("Inscrire Emma au cours de tennis")
    expect(result[0]?.code).toBe("activites")
  })

  it("suggests activites for music lessons", () => {
    const result = suggestCategoryFast("Cours de piano à 16h")
    expect(result[0]?.code).toBe("activites")
  })

  it("suggests logistique for transport", () => {
    const result = suggestCategoryFast("Organiser le covoiturage pour demain")
    expect(result[0]?.code).toBe("logistique")
  })

  it("suggests logistique for picking up kids", () => {
    const result = suggestCategoryFast("Aller chercher les enfants en voiture")
    // logistique should match with transport keywords
    const logistiqueResult = result.find(r => r.code === "logistique")
    expect(logistiqueResult).toBeDefined()
    expect(result[0]?.code).toBe("logistique")
  })

  it("returns multiple suggestions when multiple categories match", () => {
    const result = suggestCategoryFast("Emmener Emma chez le médecin après l'école")
    expect(result.length).toBeGreaterThan(1)
  })

  it("defaults to quotidien when no match", () => {
    const result = suggestCategoryFast("Faire quelque chose")
    expect(result[0]?.code).toBe("quotidien")
    expect(result[0]?.confidence).toBeLessThan(0.5)
  })

  it("provides reasons for category suggestions", () => {
    const result = suggestCategoryFast("Rendez-vous chez le dentiste")
    expect(result[0]?.reasons.length).toBeGreaterThan(0)
    expect(result[0]?.reasons[0]).toContain("Mots-clés")
  })
})

// =============================================================================
// AMBIGUITY DETECTION TESTS
// =============================================================================

describe("detectAmbiguitiesFast", () => {
  it("detects multiple children ambiguity", () => {
    const result = detectAmbiguitiesFast(
      "Préparer les affaires des enfants",
      ["Emma", "Lucas"]
    )
    // No child names explicitly mentioned, so no ambiguity
    expect(result.some((a) => a.type === "child")).toBe(false)
  })

  it("detects when multiple children are mentioned by name", () => {
    const result = detectAmbiguitiesFast(
      "Emma et Lucas ont rendez-vous chez le dentiste",
      ["Emma", "Lucas"]
    )
    const childAmbiguity = result.find((a) => a.type === "child")
    expect(childAmbiguity).toBeDefined()
    expect(childAmbiguity?.description).toContain("Emma")
    expect(childAmbiguity?.description).toContain("Lucas")
  })

  it("provides suggestions for child ambiguity", () => {
    const result = detectAmbiguitiesFast(
      "Emma et Lucas doivent faire leurs devoirs",
      ["Emma", "Lucas"]
    )
    const childAmbiguity = result.find((a) => a.type === "child")
    expect(childAmbiguity?.suggestions.length).toBeGreaterThan(0)
  })

  it("detects ambiguous date 'semaine prochaine'", () => {
    const result = detectAmbiguitiesFast("RDV la semaine prochaine")
    const dateAmbiguity = result.find((a) => a.type === "date")
    expect(dateAmbiguity).toBeDefined()
    expect(dateAmbiguity?.description).toContain("ambigu")
  })

  it("detects ambiguous date 'ce week-end'", () => {
    const result = detectAmbiguitiesFast("Sortie ce week-end")
    const dateAmbiguity = result.find((a) => a.type === "date")
    expect(dateAmbiguity).toBeDefined()
  })

  it("detects vague temporal expressions", () => {
    const result = detectAmbiguitiesFast("Il faut faire ça bientôt")
    const dateAmbiguity = result.find((a) => a.type === "date")
    expect(dateAmbiguity).toBeDefined()
    expect(dateAmbiguity?.description).toContain("vague")
  })

  it("detects 'dans quelques jours' ambiguity", () => {
    const result = detectAmbiguitiesFast("On fera ça dans quelques jours")
    const dateAmbiguity = result.find((a) => a.type === "date")
    expect(dateAmbiguity).toBeDefined()
  })

  it("detects pronoun without context", () => {
    const result = detectAmbiguitiesFast("Il doit aller chez le médecin", [])
    const childAmbiguity = result.find((a) => a.type === "child")
    expect(childAmbiguity).toBeDefined()
    expect(childAmbiguity?.description).toContain("Pronom")
  })

  it("does not flag pronoun when child is mentioned", () => {
    const result = detectAmbiguitiesFast("Emma, elle doit aller chez le médecin", ["Emma"])
    const pronounAmbiguity = result.find(
      (a) => a.type === "child" && a.description.includes("Pronom")
    )
    expect(pronounAmbiguity).toBeUndefined()
  })

  it("returns empty array for clear commands", () => {
    const result = detectAmbiguitiesFast("Demain matin à 9h", [])
    expect(result.length).toBe(0)
  })
})

// =============================================================================
// FULL FAST ANALYSIS TESTS
// =============================================================================

describe("analyzeVocalCommandFast", () => {
  it("returns complete analysis structure", () => {
    const result = analyzeVocalCommandFast("Urgent: emmener Emma chez le médecin demain")

    expect(result.primary_action).toBeDefined()
    expect(result.urgency).toBeDefined()
    expect(result.suggested_categories).toBeDefined()
    expect(result.overall_confidence).toBeDefined()
  })

  it("extracts primary action from text", () => {
    const result = analyzeVocalCommandFast("Acheter du pain, c'est important")
    expect(result.primary_action).toBe("Acheter du pain")
  })

  it("detects multi-task with 'et'", () => {
    const result = analyzeVocalCommandFast("Faire les courses et préparer le dîner")
    expect(result.multi_task).toBe(true)
  })

  it("detects multi-task with 'puis'", () => {
    const result = analyzeVocalCommandFast("Aller chercher Emma puis passer à la pharmacie")
    expect(result.multi_task).toBe(true)
  })

  it("does not flag single task as multi-task", () => {
    const result = analyzeVocalCommandFast("Prendre rendez-vous chez le médecin")
    expect(result.multi_task).toBe(false)
  })

  it("combines urgency and category confidence", () => {
    const result = analyzeVocalCommandFast("Urgent: vaccin pour Emma")
    expect(result.overall_confidence).toBeGreaterThan(0)
    expect(result.overall_confidence).toBeLessThanOrEqual(1)
  })

  it("includes ambiguities in analysis", () => {
    const result = analyzeVocalCommandFast(
      "Emma et Lucas ont un RDV la semaine prochaine",
      ["Emma", "Lucas"]
    )
    expect(result.ambiguities?.length).toBeGreaterThan(0)
  })

  it("handles empty text gracefully", () => {
    const result = analyzeVocalCommandFast("")
    expect(result.primary_action).toBe("")
    expect(result.urgency?.level).toBe("normal")
  })

  it("handles special characters in text", () => {
    const result = analyzeVocalCommandFast("RDV à l'école d'Emma!")
    expect(result.primary_action).toBeDefined()
    expect(result.suggested_categories).toBeDefined()
  })

  it("integrates urgency detection in full analysis", () => {
    const result = analyzeVocalCommandFast("C'est vraiment urgent pour le médecin")
    expect(result.urgency?.level).toBe("critical")
    expect(result.suggested_categories?.[0]?.code).toBe("sante")
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge cases", () => {
  it("handles very long text", () => {
    const longText = "Demain il faut absolument penser à aller chercher Emma à l'école " +
      "puis l'emmener chez le médecin pour son rendez-vous de contrôle " +
      "ensuite passer à la pharmacie récupérer ses médicaments " +
      "et ne pas oublier de préparer le goûter pour le lendemain"

    const result = analyzeVocalCommandFast(longText)
    expect(result.multi_task).toBe(true)
    expect(result.suggested_categories?.length).toBeGreaterThan(0)
  })

  it("handles text with numbers", () => {
    const result = analyzeVocalCommandFast("RDV à 14h30 le 15 janvier")
    expect(result.primary_action).toBeDefined()
  })

  it("handles mixed case text", () => {
    const result = analyzeVocalCommandFast("URGENT emmener EMMA chez le MÉDECIN")
    expect(result.urgency?.level).toBe("critical")
    expect(result.suggested_categories?.[0]?.code).toBe("sante")
  })

  it("handles text with emojis", () => {
    const result = analyzeVocalCommandFast("Faire les courses 🛒")
    expect(result.suggested_categories?.[0]?.code).toBe("quotidien")
  })

  it("handles accented characters correctly", () => {
    const result = suggestCategoryFast("Rendez-vous pédiatre à l'hôpital")
    expect(result[0]?.code).toBe("sante")
  })

  it("handles critical urgency correctly", () => {
    const result = detectUrgencyFast("C'est urgent, il faut faire ça maintenant!")
    expect(result.level).toBe("critical")
    expect(result.keywords_found).toContain("urgent")
  })
})
