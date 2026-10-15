package com.telemedicine.patientbooking.triage;

import java.util.List;
import java.util.Map;

/**
 * Server-side triage seam. The AiTriageProvider (Hugging Face / Groq) is the
 * primary implementation; MockTriageProvider is the fallback bean. Return
 * values are plain maps serialised directly to JSON.
 */
public interface TriageProvider {

    /**
     * Start a triage session grounded in the patient's symptoms.
     * @param reason   free-text symptom description from P-04 (may be null/blank)
     * @param symptoms canonical symptom labels extracted/selected on P-04 (may be empty)
     * @return { sessionId, question }
     */
    Map<String, Object> startTriage(String reason, List<String> symptoms);

    /** @return { question } for the next question, or { done: true } when finished. */
    Map<String, Object> submitAnswer(String sessionId, String questionId, String answer);

    /** @return the TriageResult map, or null if the session is unknown. */
    Map<String, Object> buildResult(String sessionId);
}