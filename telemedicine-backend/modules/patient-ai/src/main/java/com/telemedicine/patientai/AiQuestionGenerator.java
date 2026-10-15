package com.telemedicine.patientai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import java.net.http.HttpClient;
import java.time.Duration;

import java.util.List;
import java.util.Map;

/**
 * Generates triage questions and a triage result via an OpenAI-compatible
 * chat-completions API (default: Groq free tier). Questions are grounded in
 * the patient's symptoms. All methods degrade gracefully: on any error they
 * throw AiUnavailableException so the caller can fall back to rule-based
 * questions.
 */
@Component
public class AiQuestionGenerator {

    private static final Logger log = LoggerFactory.getLogger(AiQuestionGenerator.class);

    private final AiTriageProperties props;
    private final ObjectMapper mapper = new ObjectMapper();
    private final RestClient http;

    public AiQuestionGenerator(AiTriageProperties props) {
        this.props = props;
        HttpClient jdk = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(props.getTimeoutMs()))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(jdk);
        factory.setReadTimeout(Duration.ofMillis(props.getTimeoutMs()));
        this.http = RestClient.builder()
                .baseUrl(props.getBaseUrl())
                .requestFactory(factory)
                .build();
    }

    /** @return true when the AI backend is configured and should be attempted. */
    public boolean isAvailable() {
        return props.isEnabled() && props.hasKey();
    }

    public static final class AiUnavailableException extends RuntimeException {
        public AiUnavailableException(String message, Throwable cause) { super(message, cause); }
    }

    private String symptomLine(String reason, List<String> symptoms) {
        StringBuilder sb = new StringBuilder();
        if (symptoms != null && !symptoms.isEmpty()) {
            sb.append("Reported symptoms: ").append(String.join(", ", symptoms)).append(". ");
        }
        if (reason != null && !reason.isBlank()) {
            sb.append("Free-text description: \"").append(reason.trim()).append("\". ");
        }
        if (sb.length() == 0) sb.append("No specific symptoms were provided. ");
        return sb.toString();
    }

    /**
     * Ask the model for the next yes/no triage question grounded in the
     * patient's symptoms and prior answers. Returns a single question string.
     */
    public String nextQuestion(String reason, List<String> symptoms,
                               List<Map<String, String>> priorAnswers, int questionNumber, int total) {
        String history = priorAnswers.isEmpty()
                ? "none yet"
                : priorAnswers.stream()
                    .map(a -> "- Q: " + a.get("q") + " A: " + a.get("a"))
                    .reduce("", (acc, s) -> acc + s + "\n");

        String system = "You are a careful medical intake assistant helping triage a patient before a video "
                + "consultation. You never diagnose. You ask ONE short screening question at a time that can be "
                + "answered strictly Yes or No, grounded in the patient's reported symptoms.";

        String user = symptomLine(reason, symptoms)
                + "\nQuestions already asked and answered:\n" + history
                + "\nThis is question " + questionNumber + " of at most " + total + ". "
                + "Do not repeat a previous question. Reply with ONLY the question text, phrased so it can be "
                + "answered Yes or No. No preamble, no numbering, no explanation.";

        String raw = chat(system, user, 256);
        String q = cleanQuestion(raw);
        if (q.isBlank()) throw new AiUnavailableException("Empty question from model", null);
        return q;
    }

    /**
     * Ask the model to summarise a routing recommendation from the symptoms and
     * yes/no answers. Returns a map: recommendedSpecialty, urgency.
     */
    public Map<String, String> result(String reason, List<String> symptoms, List<Map<String, String>> answers) {
        String history = answers.stream()
                .map(a -> "- Q: " + a.get("q") + " A: " + a.get("a"))
                .reduce("", (acc, s) -> acc + s + "\n");

        String system = "You are a medical intake assistant. You never diagnose and never state an emergency "
                + "diagnosis. You produce a compact JSON routing recommendation only.";

        String user = symptomLine(reason, symptoms)
                + "\nAnswers:\n" + history
                + "\nReply with ONLY a compact JSON object, no markdown, in exactly this form:\n"
                + "{\"recommendedSpecialty\": \"<one of: General Physician, Pediatrics, Dermatology>\", "
                + "\"urgency\": \"<one of: routine, same-day>\"}";

        String raw = chat(system, user, 256);
        try {
            String json = extractJson(raw);
            JsonNode node = mapper.readTree(json);
            String specialty = node.path("recommendedSpecialty").asText("General Physician");
            String urgency = node.path("urgency").asText("routine");
            return Map.of("recommendedSpecialty", specialty, "urgency", urgency);
        } catch (Exception e) {
            throw new AiUnavailableException("Could not parse result JSON: " + raw, e);
        }
    }

    /** Low-level OpenAI-compatible chat-completions call. */
    private String chat(String system, String user, int maxTokens) {
        if (!isAvailable()) throw new AiUnavailableException("AI disabled or no key", null);
        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("model", props.getModel());
            body.put("max_tokens", maxTokens);
            body.put("temperature", 0.4);
            ArrayNode messages = body.putArray("messages");
            ObjectNode sys = messages.addObject();
            sys.put("role", "system");
            sys.put("content", system);
            ObjectNode usr = messages.addObject();
            usr.put("role", "user");
            usr.put("content", user);

            String response = http.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + props.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(mapper.writeValueAsString(body))
                    .retrieve()
                    .body(String.class);

            JsonNode root = mapper.readTree(response);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText("").isBlank()) {
                throw new AiUnavailableException("Empty chat content: " + response, null);
            }
            return content.asText();
        } catch (AiUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.warn("AI chat call failed: {}", e.getMessage());
            throw new AiUnavailableException("AI chat failed", e);
        }
    }

    private String cleanQuestion(String raw) {
        String q = raw == null ? "" : raw.trim();
        q = q.replaceAll("(?s)<think>.*?</think>", "").trim();
        q = q.replaceAll("(?s)```.*?```", "").trim();
        int nl = q.indexOf('\n');
        if (nl > 0) q = q.substring(0, nl).trim();
        q = q.replaceAll("^[0-9\\.\\)\\-\\s\"]+", "").trim();
        if (q.endsWith("\"")) q = q.substring(0, q.length() - 1).trim();
        if (!q.endsWith("?")) {
            int qm = q.indexOf('?');
            if (qm > 0) q = q.substring(0, qm + 1);
        }
        if (q.length() > 180) q = q.substring(0, 180);
        return q;
    }

    private String extractJson(String raw) {
        raw = raw.replaceAll("(?s)<think>.*?</think>", "");
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) return raw.substring(start, end + 1);
        return raw;
    }
}