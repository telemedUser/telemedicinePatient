package com.telemedicine.patientai;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

/**
 * Imports the patient-ai module into a Spring Boot application. A consuming
 * service imports this config (via @Import or component scanning) to get the
 * AiQuestionGenerator bean and the bound AiTriageProperties.
 */
@Configuration
@ComponentScan
@EnableConfigurationProperties(AiTriageProperties.class)
public class PatientAiConfig {
}