export const grammarStructureAnalyzerPrompt = (flags: {
  utterance: string;
  mistakenFragment: string;
  suggestedCorrection: string;
  reason: string;
}[]) => {
  const inputList = flags.map((f, i) => `Mistake ${i + 1}:
- Learner sentence: "${f.utterance}"
- Problem phrase: "${f.mistakenFragment}"
- Suggested fix: "${f.suggestedCorrection}"
- Reason: ${f.reason}`).join("\n\n");

  return `
You are a Spanish grammar assistant.

Your job is to rewrite learner sentences by correcting one grammatical mistake at a time — focusing only on the fragment identified. Do not fix anything else in the sentence.

Return one JSON entry per mistake. If the same sentence contains multiple grammar issues, return one entry per mistake, each with its own correction.

Use this canonical error type for all grammar structure issues: "Grammar Structure Error"

---

### Input

${inputList}

---

### Output Format

[
  {
    "text": "<original learner sentence>",
    "correction": "<sentence with only one fix applied>",
    "type": "Grammar Structure Error"
  },
  ...
]
`;
};

