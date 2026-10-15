package com.telemedicine.patientbooking.triage;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mock triage: up to 3 Yes/No questions, then a deterministic result.
 * Sessions are held in memory keyed by sessionId. Swap this bean for an
 * LlmTriageProvider later without touching the controller or frontend.
 */
@Component
public class MockTriageProvider implements TriageProvider {

    private record Q(String id, String text) {}

    private static final List<Q> QUESTIONS = List.of(
            new Q("q1", "Have your symptoms lasted more than 3 days?"),
            new Q("q2", "Do you have a fever above 38 degrees Celsius?"),
            new Q("q3", "Are your symptoms getting worse?"));

    private static final class Session {
        int index = 0;
        final List<Map<String, String>> answers = new ArrayList<>();
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    private Map<String, Object> questionAt(int index) {
        if (index >= QUESTIONS.size()) return null;
        Q q = QUESTIONS.get(index);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.id());
        m.put("text", q.text());
        m.put("number", index + 1);
        m.put("total", QUESTIONS.size());
        return m;
    }

    @Override
    public Map<String, Object> startTriage() {
        String sessionId = UUID.randomUUID().toString();
        sessions.put(sessionId, new Session());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sessionId", sessionId);
        out.put("question", questionAt(0));
        return out;
    }

    @Override
    public Map<String, Object> submitAnswer(String sessionId, String questionId, String answer) {
        Session s = sessions.get(sessionId);
        if (s == null) return Map.of("error", "unknown-session");

        if ("skip".equals(answer)) {
            return Map.of("done", true);
        }
        if (s.index < QUESTIONS.size()) {
            Q q = QUESTIONS.get(s.index);
            if (questionId == null || q.id().equals(questionId)) {
                Map<String, String> row = new LinkedHashMap<>();
                row.put("q", q.text());
                row.put("a", "yes".equals(answer) ? "Yes" : "No");
                s.answers.add(row);
                s.index++;
            }
        }
        Map<String, Object> next = questionAt(s.index);
        if (next == null) return Map.of("done", true);
        return Map.of("question", next);
    }

    @Override
    public Map<String, Object> buildResult(String sessionId) {
        Session s = sessions.get(sessionId);
        if (s == null) return null;
        boolean anyYes = s.answers.stream().anyMatch(a -> "Yes".equals(a.get("a")));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("recommendedSpecialty", "General Physician");
        out.put("videoRecommended", true);
        out.put("noEmergencySigns", true);
        out.put("urgency", anyYes ? "same-day" : "routine");
        out.put("answers", s.answers);
        return out;
    }
}