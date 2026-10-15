package com.telemedicine.patientai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the AI triage module. Bound from the "patient.ai" prefix.
 * Uses an OpenAI-compatible chat-completions endpoint (default: Groq free tier).
 * The API key is read from config (which should come from an environment
 * variable, e.g. GROQ_API_KEY) and is never hardcoded.
 */
@ConfigurationProperties(prefix = "patient.ai")
public class AiTriageProperties {

    /** Master switch. When false, the module always uses the rule-based fallback. */
    private boolean enabled = true;

    /** OpenAI-compatible chat completions endpoint. */
    private String baseUrl = "https://api.groq.com/openai/v1";

    /** Chat model id served by the provider. */
    private String model = "llama-3.3-70b-versatile";

    /** API key (free tier). Supply via GROQ_API_KEY env var. */
    private String apiKey = "";

    /** Maximum number of AI-generated questions in a triage session (spec: up to 5). */
    private int maxQuestions = 5;

    /** Per-request timeout in milliseconds for the AI call. */
    private int timeoutMs = 15000;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public int getMaxQuestions() { return maxQuestions; }
    public void setMaxQuestions(int maxQuestions) { this.maxQuestions = maxQuestions; }

    public int getTimeoutMs() { return timeoutMs; }
    public void setTimeoutMs(int timeoutMs) { this.timeoutMs = timeoutMs; }

    public boolean hasKey() { return apiKey != null && !apiKey.isBlank(); }
}