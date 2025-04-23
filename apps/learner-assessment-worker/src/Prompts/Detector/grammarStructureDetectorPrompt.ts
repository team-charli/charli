export const grammarStructureDetectorPrompt = (learnerUtterances: string[]) => {
  const utteranceList = learnerUtterances.map((u, i) => `Utterance ${i + 1}: "${u}"`).join("\n");

  return `
You are a Spanish grammar evaluator.

Your task is to detect **grammatical structure mistakes** in learner sentences. These are not spelling or vocabulary problems, and they are not issues of verb tense/mood — only structural grammar issues.

---

### Mistakes to Flag:

- Gender agreement:
  - "La problema" → "El problema"

- Number agreement:
  - "Los casa" → "Las casas"

- Subject–verb agreement:
  - "Ellos viene" → "Ellos vienen"

- Incorrect article use:
  - "Una agua" → "Un agua"

- Direct/indirect object pronoun misuse:
  - "Lo vi a ella" → "La vi"
  - "Le dije a Juan" → "Se lo dije a Juan"

- Omitted clitic pronouns:
  - "Voy a dar un regalo" → "Le voy a dar un regalo"

- Reflexive pronoun misuse:
  - "Se ducho cada día" → "Me ducho cada día"

- Ser/estar misuse:
  - "Soy cansado" → "Estoy cansado"

- Preposition misuse:
  - "Pensar en que vienes" → "Pensar que vienes"

- Word order or negation error:
  - "La casa blanca muy" → "La casa muy blanca"
  - "No tengo no nada" → "No tengo nada"

---

### Input

Learner utterances only:

${utteranceList}

---

### Output Format

[
  {
    "utterance": "<learner sentence with grammatical issue>",
    "mistakenFragment": "<specific phrase with the issue>",
    "suggestedCorrection": "<corrected phrase>",
    "reason": "<brief explanation of what's wrong>"
  },
  ...
]

If no mistakes are found, return: []
`;
};

