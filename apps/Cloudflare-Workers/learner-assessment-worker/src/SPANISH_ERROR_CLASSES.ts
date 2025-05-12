// SPANISH_ERROR_CLASSES.ts

export const SPANISH_ERROR_CLASSES = [
  // Verb conjugation errors by tense (indicative mood)
  "present tense conjugation",
  "preterite tense conjugation",
  "imperfect tense conjugation",
  "future tense conjugation",
  "conditional tense conjugation",

  // Perfect tenses (indicative mood)
  "present perfect tense conjugation",
  "past perfect tense conjugation",
  "future perfect tense conjugation",
  "conditional perfect tense conjugation",

  // Subjunctive tenses
  "present subjunctive conjugation",
  "imperfect subjunctive conjugation",
  "present perfect subjunctive conjugation",
  "past perfect subjunctive conjugation",

  // Other verb/mood issues
	"conjugation error: invalid form",
  "incorrect verb infinitive vs conjugated",
  "mood selection error (indicative vs subjunctive)",
  "imperative mood conjugation",
  "informal future construction (ir a + infinitive)",

  // Agreement and structure
  "gender agreement",
  "number agreement",
  "subject-verb agreement",
  "word order error",

  // Copula
  "ser/estar misuse",

  // Pronouns
  "reflexive pronoun misuse",
  "direct object pronoun misuse",
  "indirect object pronoun misuse",
  "omitted clitic pronoun",

  // Articles
  "incorrect article (definite/indefinite)",

  // Prepositions
  "para/por misuse",
  "preposition misuse",

  // Lexical issues
  "vocabulary misuse",
  "false cognate",
  "lexical calque",

  // Cohesion/Discourse (optional or remapped in UI)
  "discourse connector misuse",

  // Fallback
  "uncategorized"
] as const;

export type SpanishErrorClass = typeof SPANISH_ERROR_CLASSES[number];
