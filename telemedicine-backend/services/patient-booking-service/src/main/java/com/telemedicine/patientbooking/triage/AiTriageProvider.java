package com.telemedicine.patientbooking.triage;

import com.telemedicine.patientai.AiQuestionGenerator;
import com.telemedicine.patientai.AiQuestionGenerator.AiUnavailableException;
import com.telemedicine.patientai.AiTriageProperties;
import com.telemedicine.patientai.FallbackQuestions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AI-backed triage. Generates up to N (default 5) yes/no questions via the
 * Hugging Face patient-ai module, one at a time using the running answer
 * history. On any AI failure it transparently falls back to a rule-based
 * question bank, so P-06 always completes. Marked @Primary so it replaces the
 * MockTriageProvider without touching the controller or frontend.
 */
@Primary
@Component
public class AiTriageProvider implements TriageProvider {

    private static final Logger log = LoggerFactory.getLogger(AiTriageProvider.class);

    private final AiQuestionGenerator ai;
    private final AiTriageProperties props;

    public AiTriageProvider(AiQuestionGenerator ai, AiTriageProperties props) {
        this.ai = ai;
        this.props = props;
    }

    private static final class Session {
        String reason = "";
        java.util.List<String> symptoms = new ArrayList<>();
        int index = 0;                                   // questions answered so far
        String currentQuestionText;                      // text of the pending question
        boolean usedFallback = false;                    // true once any AI call failed
        final List<Map<String, String>> answers = new ArrayList<>();
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    private int total() {
        int n = props.getMaxQuestions();
        return Math.max(1, Math.min(n, FallbackQuestions.QUESTIONS.size()));
    }

    /** Produce the next question text (AI first, fallback on failure). */
    private String generate(Session s, int number) {
        if (!s.usedFallback && ai.isAvailable()) {
            try {
                return ai.nextQuestion(s.reason, s.symptoms, s.answers, number, total());
            } catch (AiUnavailableException e) {
                log.info("AI triage unavailable (q{}), using fallback: {}", number, e.getMessage());
                s.usedFallback = true;
            }
        }
        return FallbackQuestions.at(number - 1);
    }

    private Map<String, Object> questionPayload(Session s) {
        int number = s.index + 1;
        if (number > total()) return null;
        String text = generate(s, number);
        if (text == null || text.isBlank()) return null;
        s.currentQuestionText = text;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", "q" + number);
        m.put("text", text);
        m.put("number", number);
        m.put("total", total());
        return m;
    }

    @Override
    public Map<String, Object> startTriage(String reason, java.util.List<String> symptoms) {
        String sessionId = UUID.randomUUID().toString();
        Session s = new Session();
        s.reason = reason == null ? "" : reason;
        if (symptoms != null) s.symptoms.addAll(symptoms);
        sessions.put(sessionId, s);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sessionId", sessionId);
        out.put("question", questionPayload(s));
        return out;
    }

    @Override
    public Map<String, Object> submitAnswer(String sessionId, String questionId, String answer) {
        Session s = sessions.get(sessionId);
        if (s == null) return Map.of("error", "unknown-session");

        if ("skip".equals(answer)) {
            return Map.of("done", true);
        }

        // Record the answer against the pending question.
        if (s.currentQuestionText != null) {
            Map<String, String> row = new LinkedHashMap<>();
            row.put("q", s.currentQuestionText);
            row.put("a", "yes".equals(answer) ? "Yes" : "No");
            s.answers.add(row);
            s.index++;
            s.currentQuestionText = null;
        }

        if (s.index >= total()) {
            return Map.of("done", true);
        }
        Map<String, Object> next = questionPayload(s);
        if (next == null) return Map.of("done", true);
        return Map.of("question", next);
    }

    @Override
    public Map<String, Object> buildResult(String sessionId) {
        Session s = sessions.get(sessionId);
        if (s == null) return null;

        String specialty = "General Physician";
        String urgency = "routine";

        boolean anyYes = s.answers.stream().anyMatch(a -> "Yes".equals(a.get("a")));

        if (!s.usedFallback && ai.isAvailable() && !s.answers.isEmpty()) {
            try {
                Map<String, String> r = ai.result(s.reason, s.symptoms, s.answers);
                specialty = r.getOrDefault("recommendedSpecialty", specialty);
                urgency = r.getOrDefault("urgency", urgency);
            } catch (AiUnavailableException e) {
                log.info("AI triage result unavailable, using fallback: {}", e.getMessage());
                urgency = anyYes ? "same-day" : "routine";
            }
        } else {
            urgency = anyYes ? "same-day" : "routine";
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("recommendedSpecialty", specialty);
        out.put("videoRecommended", true);
        out.put("noEmergencySigns", true);
        out.put("urgency", urgency);
        out.put("answers", s.answers);
        return out;
    }
}