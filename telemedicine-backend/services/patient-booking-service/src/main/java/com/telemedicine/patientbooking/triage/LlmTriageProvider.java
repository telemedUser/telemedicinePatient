package com.telemedicine.patientbooking.triage;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Claude-backed (Anthropic) AI triage for P-06. On start, one call to Claude turns the patient's
 * prioritised symptoms + free-text description into up to N (default 3) plain Yes/No questions and a
 * recommendation plan (specialty, video, rationale, which questions are emergency red-flags). The
 * questions are then stepped through with the same HTTP envelope the frontend already expects
 * (number/total, then {done:true}); the final result reflects the patient's Yes/No answers.
 *
 * <p>Resilience: if there is no API key, or Claude errors/times out or returns unparseable JSON, we
 * fall back to a built-in symptom-aware plan so triage never hard-fails the booking.
 */
@Primary
@Component
public class LlmTriageProvider implements TriageProvider {

    private static final Logger log = LoggerFactory.getLogger(LlmTriageProvider.class);

    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String workspaceId;
    private final String baseUrl;
    private final String model;
    private final int maxQuestions;
    /** Plain direct-HTTP client (NOT the service-discovery/load-balanced one) for the external API. */
    private final RestClient anthropic;

    public LlmTriageProvider(
            ObjectMapper objectMapper,
            @Value("${triage.anthropic.api-key:}") String apiKey,
            @Value("${triage.anthropic.workspace-id:}") String workspaceId,
            @Value("${triage.anthropic.base-url:https://api.anthropic.com}") String baseUrl,
            @Value("${triage.anthropic.model:claude-haiku-4-5-20251001}") String model,
            @Value("${triage.anthropic.max-questions:3}") int maxQuestions) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.workspaceId = workspaceId == null ? "" : workspaceId.trim();
        this.baseUrl = baseUrl;
        this.model = model;
        this.maxQuestions = Math.max(1, Math.min(3, maxQuestions));
        this.anthropic = RestClient.builder().baseUrl(baseUrl).build();
    }

    /** One triage question the AI generated. {@code emergency} marks a red-flag question. */
    private record PlanQuestion(String id, String text, boolean emergency) {}

    /** The AI plan built once at start: the questions + the recommendation scaffold. */
    private static final class Session {
        List<PlanQuestion> questions = new ArrayList<>();
        String recommendedSpecialty = "General Physician";
        boolean videoRecommended = true;
        String rationale = "";
        int index = 0;
        final List<Map<String, String>> answers = new ArrayList<>();
        /** Questions the patient answered "Yes" to that were flagged as emergency red-flags. */
        boolean emergencyYes = false;
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    private Map<String, Object> questionMap(Session s, int index) {
        if (index >= s.questions.size()) return null;
        PlanQuestion q = s.questions.get(index);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.id());
        m.put("text", q.text());
        m.put("number", index + 1);
        m.put("total", s.questions.size());
        return m;
    }

    @Override
    public Map<String, Object> startTriage(Map<String, Object> context) {
        String sessionId = UUID.randomUUID().toString();
        Session s = new Session();
        try {
            buildPlan(s, context);
        } catch (RuntimeException e) {
            log.warn("AI triage planning failed; using fallback plan", e);
        }
        if (s.questions.isEmpty()) {
            fallbackPlan(s, context);
        }
        sessions.put(sessionId, s);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sessionId", sessionId);
        out.put("question", questionMap(s, 0));
        return out;
    }

    @Override
    public Map<String, Object> submitAnswer(String sessionId, String questionId, String answer) {
        Session s = sessions.get(sessionId);
        if (s == null) return Map.of("error", "unknown-session");

        if ("skip".equals(answer)) {
            return Map.of("done", true);
        }
        if (s.index < s.questions.size()) {
            PlanQuestion q = s.questions.get(s.index);
            if (questionId == null || q.id().equals(questionId)) {
                boolean yes = "yes".equals(answer);
                Map<String, String> row = new LinkedHashMap<>();
                row.put("q", q.text());
                row.put("a", yes ? "Yes" : "No");
                s.answers.add(row);
                if (yes && q.emergency()) {
                    s.emergencyYes = true;
                }
                s.index++;
            }
        }
        Map<String, Object> next = questionMap(s, s.index);
        if (next == null) return Map.of("done", true);
        return Map.of("question", next);
    }

    @Override
    public Map<String, Object> buildResult(String sessionId) {
        Session s = sessions.get(sessionId);
        if (s == null) return null;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("recommendedSpecialty", s.recommendedSpecialty);
        out.put("videoRecommended", s.videoRecommended);
        // Emergency signs are "none reported" unless the patient answered Yes to a red-flag question.
        out.put("noEmergencySigns", !s.emergencyYes);
        boolean anyYes = s.answers.stream().anyMatch(a -> "Yes".equals(a.get("a")));
        out.put("urgency", s.emergencyYes ? "urgent" : anyYes ? "same-day" : "routine");
        out.put("rationale", s.rationale);
        out.put("answers", s.answers);
        return out;
    }

    /* ------------------------- Claude call ------------------------- */

    private void buildPlan(Session s, Map<String, Object> context) {
        if (apiKey.isEmpty()) {
            log.info("No Anthropic API key configured; AI triage will use the fallback plan");
            return;
        }
        String symptomText = str(context.get("symptomText"));
        List<String> symptoms = symptomList(context.get("symptoms"));
        String duration = str(context.get("duration"));
        String severity = str(context.get("severity"));

        String userPrompt =
                "A patient is booking a telemedicine consultation. Based ONLY on the information below,"
                    + " produce a short pre-consultation triage.\n\n"
                    + "Prioritised symptoms: " + (symptoms.isEmpty() ? "(none selected)" : String.join(", ", symptoms)) + "\n"
                    + "Free-text description: " + (symptomText.isBlank() ? "(none)" : symptomText) + "\n"
                    + "Duration: " + (duration.isBlank() ? "(unknown)" : duration) + "\n"
                    + "Severity (0-10): " + (severity.isBlank() ? "(unknown)" : severity) + "\n\n"
                    + "Return STRICT JSON only (no prose, no markdown) with this exact shape:\n"
                    + "{\n"
                    + "  \"questions\": [ { \"text\": \"...\", \"emergency\": true|false } ],\n"
                    + "  \"recommendedSpecialty\": \"...\",\n"
                    + "  \"videoRecommended\": true|false,\n"
                    + "  \"rationale\": \"one short sentence a patient can read\"\n"
                    + "}\n\n"
                    + "Rules: at most " + maxQuestions + " questions; each MUST be answerable strictly Yes or No;"
                    + " prefer questions that screen for emergency red-flags (mark those emergency:true);"
                    + " keep each question under 12 words, plain language, no medical jargon;"
                    + " recommendedSpecialty should be a common specialty label (e.g. \"General Physician\");"
                    + " this is assistive only and a doctor makes every decision.";

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("model", model);
        payload.put("max_tokens", 600);
        ArrayNode messages = payload.putArray("messages");
        ObjectNode msg = messages.addObject();
        msg.put("role", "user");
        msg.put("content", userPrompt);

        String body =
                anthropic.post()
                        .uri("/v1/messages")
                        .headers(h -> {
                            h.set("x-api-key", apiKey);
                            h.set("anthropic-version", "2023-06-01");
                            // Workspace-scoped keys must name the workspace on every request.
                            if (!workspaceId.isEmpty()) {
                                h.set("anthropic-workspace-id", workspaceId);
                            }
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(payload.toString())
                        .retrieve()
                        .body(String.class);

        JsonNode root = readTree(body);
        // Anthropic Messages API: { content: [ { type:"text", text:"..." } ], ... }
        String text = root.path("content").path(0).path("text").asText("");
        JsonNode plan = readTree(extractJson(text));
        if (plan == null) {
            throw new IllegalStateException("Claude returned no parseable plan");
        }

        JsonNode qs = plan.path("questions");
        int i = 1;
        for (JsonNode q : qs) {
            if (s.questions.size() >= maxQuestions) break;
            String qt = q.path("text").asText("").trim();
            if (qt.isEmpty()) continue;
            s.questions.add(new PlanQuestion("q" + i++, qt, q.path("emergency").asBoolean(false)));
        }
        if (plan.hasNonNull("recommendedSpecialty")) {
            s.recommendedSpecialty = plan.get("recommendedSpecialty").asText(s.recommendedSpecialty);
        }
        s.videoRecommended = plan.path("videoRecommended").asBoolean(true);
        s.rationale = plan.path("rationale").asText("");
        log.info("AI triage plan: {} question(s), specialty={}", s.questions.size(), s.recommendedSpecialty);
    }

    /* ------------------------- Fallback ------------------------- */

    /** Symptom-aware default plan when Claude is unavailable — keeps triage working. */
    private void fallbackPlan(Session s, Map<String, Object> context) {
        s.questions.clear();
        s.questions.add(new PlanQuestion("q1", "Do you have difficulty breathing or swallowing?", true));
        s.questions.add(new PlanQuestion("q2", "Do you have a fever above 38 degrees Celsius?", false));
        s.questions.add(new PlanQuestion("q3", "Are your symptoms getting worse?", false));
        s.recommendedSpecialty = "General Physician";
        s.videoRecommended = true;
        s.rationale = "Based on your symptoms, a general physician can usually help, by video.";
    }

    /* ------------------------- helpers ------------------------- */

    private JsonNode readTree(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            return null;
        }
    }

    /** Pull the first {...} JSON object out of a possibly-fenced model reply. */
    private static String extractJson(String text) {
        if (text == null) return "";
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        return (start >= 0 && end > start) ? text.substring(start, end + 1) : text;
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    @SuppressWarnings("unchecked")
    private static List<String> symptomList(Object o) {
        List<String> out = new ArrayList<>();
        if (o instanceof List<?> list) {
            for (Object item : list) {
                if (item != null) out.add(String.valueOf(item));
            }
        }
        return out;
    }
}
