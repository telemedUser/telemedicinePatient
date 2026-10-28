package com.telemedicine.patientbooking.triage;

import java.util.Map;

/**
 * Server-side triage seam. LlmTriageProvider (Claude-backed) is the primary implementation;
 * MockTriageProvider is the deterministic fallback. Neither changes the HTTP contract or the
 * frontend. Return values are plain maps serialised directly to JSON.
 */
public interface TriageProvider {

    /**
     * Start a triage session using the symptom context captured on P-04.
     *
     * @param context { symptomText:String, symptoms:List<String> (prioritized), duration:String,
     *     severity:Number }
     * @return { sessionId, question }
     */
    Map<String, Object> startTriage(Map<String, Object> context);

    /** @return { question } for the next question, or { done: true } when finished. */
    Map<String, Object> submitAnswer(String sessionId, String questionId, String answer);

    /** @return the TriageResult map, or null if the session is unknown. */
    Map<String, Object> buildResult(String sessionId);
}