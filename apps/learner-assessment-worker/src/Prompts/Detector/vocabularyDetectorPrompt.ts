export const vocabularyDetectorPrompt = (learnerUtterances: string[]) => {
  const utteranceList = learnerUtterances.map((u, i) => `Utterance ${i + 1}: "${u}"`).join("\n");

  return `
You are a Spanish language evaluator.

Your task is to detect **vocabulary-level mistakes** in learner sentences. These are not grammar or conjugation errors — they are issues with **word choice, false cognates, idioms, or unnatural expressions.**

You must use full sentence meaning and surrounding dialogue to identify if the learner used a word or phrase that a native speaker would find incorrect or awkward.

---

### Mistakes to Flag:

- False friends (false cognates):
  - "Estoy embarazada" (when speaker meant "I'm embarrassed")

- Lexical calques (literal translation):
  - "Realizar una tarea" instead of "Hacer una tarea"
  - "Casa de campo" instead of "granja" (if intended as "farm")

- Incorrect idiomatic expressions:
  - "Hacer sentido" → "Tener sentido"
  - "Tomar un baño" → "Bañarse" (unless regional context justifies)

- Misused discourse connectors:
  - "Pero entonces sin embargo..."

Do not flag:
- Grammatical mistakes
- Verb tense or conjugation issues
- Spelling errors

---

### Input

Learner utterances only:

${utteranceList}

---

### Output Format

Return a JSON array like:

[
  {
    "utterance": "<learner sentence with vocabulary issue>",
    "mistakenFragment": "<wrong word or phrase>",
    "suggestedCorrection": "<more appropriate word or phrase>",
    "reason": "<brief explanation of why the original is incorrect>"
  },
  ...
]

If no mistakes are found, return an empty array: []
`;
};

