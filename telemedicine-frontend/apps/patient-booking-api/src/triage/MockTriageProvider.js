// MockTriageProvider — implements the Triage_Provider seam.
//
// Interface (so an LlmTriageProvider can replace this later with no HTTP/
// frontend change):
//   startTriage(context) -> { sessionId, question }
//   submitAnswer(sessionId, { questionId, answer }) -> { question } | { done: true }
//   buildResult(sessionId) -> TriageResult
//
// Sessions are kept in memory keyed by sessionId. At most 3 Yes/No questions
// are asked; "skip" at any point yields a result from the answers so far.

import { randomUUID } from "node:crypto";

const sessions = new Map();

const QUESTIONS = [
  { id: "q1", text: "Have your symptoms lasted more than 3 days?" },
  { id: "q2", text: "Do you have a fever above 38 degrees Celsius?" },
  { id: "q3", text: "Are your symptoms getting worse?" },
];

function questionAt(index) {
  const q = QUESTIONS[index];
  if (!q) return null;
  return { id: q.id, text: q.text, number: index + 1, total: QUESTIONS.length };
}

export const MockTriageProvider = {
  name: "mock",

  startTriage() {
    const sessionId = randomUUID();
    sessions.set(sessionId, { index: 0, answers: [] });
    return { sessionId, question: questionAt(0) };
  },

  submitAnswer(sessionId, { questionId, answer }) {
    const session = sessions.get(sessionId);
    if (!session) return { error: "unknown-session" };

    if (answer === "skip") {
      session.done = true;
      return { done: true };
    }

    const q = QUESTIONS[session.index];
    if (q && (!questionId || q.id === questionId)) {
      session.answers.push({ q: q.text, a: answer === "yes" ? "Yes" : "No" });
      session.index += 1;
    }

    const next = questionAt(session.index);
    if (!next) {
      session.done = true;
      return { done: true };
    }
    return { question: next };
  },

  buildResult(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    // Simple deterministic rule: a "Yes" to worsening/fever nudges urgency,
    // but the recommended specialty stays General Physician for the mock.
    const anyYes = session.answers.some((a) => a.a === "Yes");
    return {
      recommendedSpecialty: "General Physician",
      videoRecommended: true,
      noEmergencySigns: true,
      urgency: anyYes ? "same-day" : "routine",
      answers: session.answers,
    };
  },
};

export function selectProvider() {
  // Swap to an LlmTriageProvider here later; the HTTP contract is unchanged.
  return MockTriageProvider;
}