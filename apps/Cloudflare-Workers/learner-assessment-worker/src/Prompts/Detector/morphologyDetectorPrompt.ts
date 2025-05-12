export const morphologyDetectorPrompt = (learnerUtterances: string[]) => {
  const utteranceList = learnerUtterances.map((u, i) => `Utterance ${i + 1}: "${u}"`).join("\n");

  return `
You are a Spanish language evaluator.

Your job is to find malformed or misspelled verb forms in learner speech. These are NOT mistakes of tense, mood, or context — only problems with the **form of the verb itself**.

You are looking for verbs that:
- Do not exist in Spanish
- Are invalid combinations of root + ending
- Are inflected incorrectly (e.g. wrong person, number, or conjugation suffix)
- Might have been mispronounced or mistyped (e.g. ASR artifacts)

Examples of mistakes to flag:
- "jugimos" (invalid form of "jugar")
- "comiómos" (nonexistent hybrid of "comió" and "comimos")
- "juguen" (wrong form for this subject)

Do not flag:
- Correct verb forms even if they're used in the wrong context
- Minor typos in non-verbs

---

### Input

The following are learner utterances only:

${utteranceList}

---

### Output Format

Return a JSON array like:

[
  {
    "utterance": "<learner sentence containing the malformed verb>",
    "mistakenFragment": "<exact malformed verb>",
    "suggestedCorrection": "<best guess at what the learner meant>",
    "reason": "<brief reason the original form is invalid>"
  },
  ...
]

Return an empty array if no malformed verbs are found.
`;
};

