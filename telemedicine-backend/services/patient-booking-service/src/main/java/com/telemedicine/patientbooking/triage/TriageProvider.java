package com.telemedicine.patientbooking.triage;

import java.util.Map;

/**
 * Server-side triage seam. The MockTriageProvider implements this now; an
 * LlmTriageProvider can replace it later with no change to the HTTP contract
 * or the frontend. Return values are plain maps serialised directly to JSON.
 */
public interface TriageProvider {

    /** @return { sessionId, question } */
    Map<String, Object> startTriage();

    /** @return { question } for the next question, or { done: true } when finished. */
    Map<String, Object> submitAnswer(String sessionId, String questionId, String answer);

    /** @return the TriageResult map, or null if the session is unknown. */
    Map<String, Object> buildResult(String sessionId);
}