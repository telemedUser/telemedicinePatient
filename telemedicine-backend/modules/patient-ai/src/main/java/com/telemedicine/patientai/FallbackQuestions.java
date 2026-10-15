package com.telemedicine.patientai;

import java.util.List;

/**
 * Deterministic rule-based triage questions used when the AI provider is
 * disabled, has no token, or the Hugging Face call fails. Keeps P-06 working
 * offline. Up to five generic yes/no triage questions.
 */
public final class FallbackQuestions {

    private FallbackQuestions() {}

    public static final List<String> QUESTIONS = List.of(
            "Have your symptoms lasted more than 3 days?",
            "Do you have a fever above 38 degrees Celsius?",
            "Are your symptoms getting worse rather than improving?",
            "Are the symptoms affecting your sleep or daily activities?",
            "Have you tried any over-the-counter treatment without relief?");

    /** @return the question text at index, or null when beyond the set. */
    public static String at(int index) {
        if (index < 0 || index >= QUESTIONS.size()) return null;
        return QUESTIONS.get(index);
    }
}