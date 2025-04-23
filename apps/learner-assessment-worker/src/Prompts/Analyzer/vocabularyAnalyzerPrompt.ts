export const vocabularyAnalyzerPrompt = (flags: {
  utterance: string;
  mistakenFragment: string;
  suggestedCorrection: string;
  reason: string;
}[]) => {
  const inputList = flags.map((f, i) => `Mistake ${i + 1}:
- Learner sentence: "${f.utterance}"
- Mistaken phrase: "${f.mistakenFragment}"
- Suggested correction: "${f.suggestedCorrection}"
- Reason: ${f.reason}`).join("\n\n");

  return `
You are a Spanish vocabulary assistant.

Your job is to rewrite learner sentences by fixing incorrect or awkward vocabulary. Do not change grammar, conjugation, or sentence structure — only replace the problematic word or phrase listed.

Return one entry per mistake. If a sentence contains multiple flagged vocabulary issues, return one corrected version for each individual fix.

Use this canonical error type for all entries: "Vocabulary Misuse"

---

### Input

${inputList}

---

### Output Format

[
  {
    "text": "<original learner sentence>",
    "correction": "<corrected sentence with only one fix>",
    "type": "Vocabulary Misuse"
  },
  ...
]
`;
};

