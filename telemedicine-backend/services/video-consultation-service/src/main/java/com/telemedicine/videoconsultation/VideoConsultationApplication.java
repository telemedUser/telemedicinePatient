package com.telemedicine.videoconsultation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Video consultation service: WebRTC signaling relay (/ws) plus the clinical
 * API (patient context + care plan) used by the patient and physician apps.
 * Ported from the CareConnect starter and backed by the shared telemedicine
 * database instead of in-memory maps.
 */
@SpringBootApplication
public class VideoConsultationApplication {
    public static void main(String[] args) {
        SpringApplication.run(VideoConsultationApplication.class, args);
    }
}