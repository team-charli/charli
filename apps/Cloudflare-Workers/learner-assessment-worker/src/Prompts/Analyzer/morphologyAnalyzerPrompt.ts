export const morphologyAnalyzerPrompt = (flags: {
  utterance: string;
  mistakenFragment: string;
  suggestedCorrection: string;
  reason: string;
}[]) => {
  const inputList = flags.map((f, i) => `Mistake ${i + 1}:
- Learner sentence: "${f.utterance}"
- Mistaken verb form: "${f.mistakenFragment}"
- Correct form: "${f.suggestedCorrection}"
- Reason: ${f.reason}`).join("\n\n");

  return `
You are a Spanish grammar assistant.

Your task is to correct malformed verb forms in learner sentences. For each entry below:
- Rewrite the full learner sentence, fixing **only the malformed verb**
- Assign the canonical error type: "Conjugation Error: Invalid Form"
- Do not change anything else in the sentence.

Return one entry per mistake, even if multiple appear in the same sentence.

---

### Input:

${inputList}

---

### Output Format:

Return a JSON array like this:

[
  {
    "text": "<original learner sentence>",
    "correction": "<corrected sentence with only one fix>",
    "type": "Conjugation Error: Invalid Form"
  },
  ...
]
`;
};

