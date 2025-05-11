export const lemmaFingerprintPrompt = (mistakes: {
  text: string;
  correction: string;
}[]) => {
  const formatted = mistakes.map((m, i) => `Mistake ${i + 1}:
- Original: "${m.text}"
- Corrected: "${m.correction}"`).join('\n\n');

  return `
You are a Spanish language assistant.

For each learner mistake below, extract the minimal changed portion from the original sentence and the corrected sentence, in the format:

"wrong → correct"

This is not necessarily a full word — it can be a phrase, clitic, verb form, or small part of the sentence.

Return a JSON array of strings like:

[
  "jugimos → jugamos",
  "la problema → el problema"
]

Return one entry per mistake, in the same order as the input.

---

${formatted}
`;
};

