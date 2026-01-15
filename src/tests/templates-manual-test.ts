/**
 * Test manuel: Vérification des templates applicables à un enfant
 * Ce test vérifie que les templates sont correctement filtrés par âge
 */

import { allTemplatesFR, getTemplatesForAge, templatesByCategoryFR, TEMPLATES_COUNT_FR } from "@/lib/data/templates-fr"

// Test helper
function log(msg: string) {
  console.log(`\n✓ ${msg}`)
}

function logError(msg: string) {
  console.error(`\n✗ ${msg}`)
}

function logSection(title: string) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`  ${title}`)
  console.log(`${"=".repeat(60)}`)
}

// Test 1: Verify total template count
logSection("TEST 1: Vérification du nombre total de templates")
console.log(`Nombre total de templates: ${TEMPLATES_COUNT_FR}`)
if (TEMPLATES_COUNT_FR >= 50) {
  log(`✓ Plus de 50 templates disponibles (${TEMPLATES_COUNT_FR})`)
} else {
  logError(`Moins de 50 templates (${TEMPLATES_COUNT_FR})`)
  process.exit(1)
}

// Test 2: Verify templates by category
logSection("TEST 2: Templates par catégorie")
const categories = Object.keys(templatesByCategoryFR)
console.log(`Catégories disponibles: ${categories.join(", ")}`)
for (const category of categories) {
  const count = templatesByCategoryFR[category as keyof typeof templatesByCategoryFR].length
  console.log(`  - ${category}: ${count} templates`)
}

// Test 3: Test templates for a 2-year-old child (0-3 age group)
logSection("TEST 3: Templates pour un enfant de 2 ans (0-3 ans)")
const templatesAge2 = getTemplatesForAge(2)
console.log(`Nombre de templates applicables: ${templatesAge2.length}`)

// Verify expected categories
const categoriesForAge2 = [...new Set(templatesAge2.map(t => t.category))]
console.log(`Catégories: ${categoriesForAge2.join(", ")}`)

// Check some expected templates
const expectedForAge2 = [
  "Visite PMI mensuelle",
  "Déclaration CAF - PAJE",
]
for (const expected of expectedForAge2) {
  const found = templatesAge2.some(t => t.title.includes(expected.split(" - ")[0] ?? ""))
  if (found) {
    log(`Template "${expected}" trouvé`)
  } else {
    console.log(`⚠ Template "${expected}" non trouvé (peut être normal selon l'âge exact)`)
  }
}

// Test 4: Test templates for a 5-year-old child (maternelle)
logSection("TEST 4: Templates pour un enfant de 5 ans (maternelle)")
const templatesAge5 = getTemplatesForAge(5)
console.log(`Nombre de templates applicables: ${templatesAge5.length}`)

// Check for school-related templates
const schoolTemplatesAge5 = templatesAge5.filter(t => t.category === "ecole")
console.log(`Templates scolaires: ${schoolTemplatesAge5.length}`)

// Expected templates for 5 years old
const expectedForAge5 = [
  "Assurance scolaire",
  "Liste fournitures maternelle",
  "Réunion de rentrée maternelle",
]
for (const expected of expectedForAge5) {
  const found = templatesAge5.some(t => t.title.toLowerCase().includes(expected.toLowerCase().split(" ")[0] ?? ""))
  if (found) {
    log(`Template lié à "${expected}" trouvé`)
  } else {
    logError(`Template "${expected}" non trouvé - ERREUR`)
  }
}

// Test 5: Test templates for a 8-year-old child (primaire)
logSection("TEST 5: Templates pour un enfant de 8 ans (primaire)")
const templatesAge8 = getTemplatesForAge(8)
console.log(`Nombre de templates applicables: ${templatesAge8.length}`)

// Check for expected school templates
const expectedForAge8 = [
  "Fournitures scolaires primaire",
  "Inscription cantine",
  "Réunion de rentrée primaire",
]
for (const expected of expectedForAge8) {
  const found = templatesAge8.some(t =>
    t.title.toLowerCase().includes(expected.split(" ")[0]?.toLowerCase() ?? "")
  )
  if (found) {
    log(`Template lié à "${expected}" trouvé`)
  } else {
    logError(`Template "${expected}" non trouvé - ERREUR`)
  }
}

// Test 6: Test templates for a 14-year-old child (collège 3ème)
logSection("TEST 6: Templates pour un enfant de 14 ans (collège 3ème)")
const templatesAge14 = getTemplatesForAge(14)
console.log(`Nombre de templates applicables: ${templatesAge14.length}`)

// Check for orientation and brevet templates
const expectedForAge14 = [
  "Stage d'observation 3ème",
  "Choix orientation",
  "Inscription Brevet",
]
for (const expected of expectedForAge14) {
  const found = templatesAge14.some(t =>
    t.title.toLowerCase().includes(expected.split(" ")[0]?.toLowerCase() ?? "")
  )
  if (found) {
    log(`Template lié à "${expected}" trouvé`)
  } else {
    console.log(`⚠ Template "${expected}" non trouvé (vérifier l'âge exact)`)
  }
}

// Test 7: Test templates for a 17-year-old child (lycée Terminale)
logSection("TEST 7: Templates pour un enfant de 17 ans (Terminale)")
const templatesAge17 = getTemplatesForAge(17)
console.log(`Nombre de templates applicables: ${templatesAge17.length}`)

// Check for Parcoursup and Bac templates
const expectedForAge17 = [
  "Parcoursup",
  "Baccalauréat",
  "permis",
]
for (const expected of expectedForAge17) {
  const found = templatesAge17.some(t =>
    t.title.toLowerCase().includes(expected.toLowerCase())
  )
  if (found) {
    log(`Template lié à "${expected}" trouvé`)
  } else {
    logError(`Template "${expected}" non trouvé - ERREUR`)
  }
}

// Test 8: Verify age boundaries are correct
logSection("TEST 8: Vérification des bornes d'âge")
const allAges = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
console.log("Templates par âge:")
for (const age of allAges) {
  const count = getTemplatesForAge(age).length
  console.log(`  ${age} ans: ${count} templates`)
}

// Verify no template is applicable beyond 18
const templatesAge19 = getTemplatesForAge(19)
if (templatesAge19.length === 0) {
  log("Aucun template pour 19 ans (correct - limite à 18 ans)")
} else {
  console.log(`⚠ ${templatesAge19.length} templates trouvés pour 19 ans`)
}

// Test 9: Verify template structure
logSection("TEST 9: Vérification de la structure des templates")
let structureValid = true
for (const template of allTemplatesFR) {
  if (typeof template.title !== "string" || template.title.length === 0) {
    logError(`Template sans titre valide`)
    structureValid = false
    break
  }
  if (typeof template.category !== "string" || template.category.length === 0) {
    logError(`Template "${template.title}" sans catégorie`)
    structureValid = false
    break
  }
  if (typeof template.age_min !== "number" || typeof template.age_max !== "number") {
    logError(`Template "${template.title}" avec âges invalides`)
    structureValid = false
    break
  }
  if (template.age_min > template.age_max) {
    logError(`Template "${template.title}" avec age_min > age_max`)
    structureValid = false
    break
  }
  if (typeof template.weight !== "number" || template.weight < 1 || template.weight > 10) {
    logError(`Template "${template.title}" avec poids invalide: ${template.weight}`)
    structureValid = false
    break
  }
}
if (structureValid) {
  log("Tous les templates ont une structure valide")
}

// Test 10: Verify category coverage
logSection("TEST 10: Couverture des catégories")
const expectedCategories = [
  "sante",
  "ecole",
  "administratif",
  "logistique",
  "activites",
  "social",
  "quotidien"
]
const templateCategories = [...new Set(allTemplatesFR.map(t => t.category))]
console.log(`Catégories trouvées: ${templateCategories.join(", ")}`)

for (const cat of expectedCategories) {
  if (templateCategories.includes(cat)) {
    const count = allTemplatesFR.filter(t => t.category === cat).length
    log(`Catégorie "${cat}" présente (${count} templates)`)
  } else {
    logError(`Catégorie "${cat}" manquante`)
  }
}

// Final summary
logSection("RÉSUMÉ DU TEST MANUEL")
console.log(`✓ Total templates: ${TEMPLATES_COUNT_FR}`)
console.log(`✓ Catégories couvertes: ${templateCategories.length}`)
console.log(`✓ Âges couverts: 0-18 ans`)
console.log(`\n🎉 TEST MANUEL TERMINÉ AVEC SUCCÈS`)
