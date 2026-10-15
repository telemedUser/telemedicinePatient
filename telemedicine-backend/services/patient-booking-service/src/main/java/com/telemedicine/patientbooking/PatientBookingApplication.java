package com.telemedicine.patientbooking;

import com.telemedicine.patientai.PatientAiConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import(PatientAiConfig.class)
public class PatientBookingApplication {
    public static void main(String[] args) {
        SpringApplication.run(PatientBookingApplication.class, args);
    }
}