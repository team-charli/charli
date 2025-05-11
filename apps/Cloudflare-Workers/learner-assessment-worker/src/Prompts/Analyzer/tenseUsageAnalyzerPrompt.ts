export const tenseUsageAnalyzerPrompt = (flags: TenseUsageFlag[]) => {
  const inputList = flags.map((f, i) => `Mistake ${i + 1}:
- Learner sentence: "${f.utterance}"
- Mistaken verb form: "${f.mistakenFragment}"
- Correct tense: ${f.suggestedTense}
- Reason: ${f.reason}`).join("\n\n");

  return `
You are a Spanish grammar assistant.

For each mistake below, correct the learner's sentence by fixing **only the specific verb mentioned** in the mistake. Do not apply additional corrections, even if other verbs are also incorrect.

You must return **one entry per mistake**. If multiple mistakes are found in the same sentence, you must return multiple entries — each with:
- the full learner sentence as "text"
- a version of the sentence with only one verb fixed as "correction"
- a canonical error type of the form: "Conjugation Error: <Tense>"

Do not compress multiple verb corrections into one correction field.

---

### Input:

${inputList}

---

### Output Format:
Return a JSON array like this:
[
  {
    "text": "<original sentence>",
    "correction": "<corrected sentence with only one fix>",
    "type": "Conjugation Error: <Tense>"
  },
  ...
]
`;
};

