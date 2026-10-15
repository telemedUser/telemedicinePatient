package com.telemedicine.patientbooking.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Translates errors into an RFC-7807-ish problem+json body so the frontend's
 * parseError (which reads title/detail) behaves the same as against the Node
 * reference backend.
 */
@ControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        String title = status != null ? status.getReasonPhrase() : "Error";
        return ResponseEntity.status(ex.getStatusCode()).body(problem(
                ex.getStatusCode().value(), title, ex.getReason() != null ? ex.getReason() : title));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem(
                500, "Internal Server Error", "Something went wrong."));
    }

    private Map<String, Object> problem(int status, String title, String detail) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "about:blank");
        body.put("title", title);
        body.put("status", status);
        body.put("detail", detail);
        return body;
    }
}