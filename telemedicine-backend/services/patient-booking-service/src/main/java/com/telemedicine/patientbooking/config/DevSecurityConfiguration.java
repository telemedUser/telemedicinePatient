package com.telemedicine.patientbooking.config;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Local-development security ONLY (active on the {@code dev} profile). Declaring a {@link
 * SecurityFilterChain} bean here suppresses the shared Keycloak resource-server chain (it backs off
 * on {@code @ConditionalOnMissingBean(SecurityFilterChain.class)}).
 *
 * <p>It permits every request and installs an anonymous authentication carrying the PATIENT role,
 * so the platform's method security still has an authenticated principal in dev while the booking
 * frontend sends no real token. In any real environment the {@code dev} profile is absent and the
 * normal JWT chain applies.
 */
@Configuration
@Profile("dev")
public class DevSecurityConfiguration {

    @Bean
    SecurityFilterChain devSecurityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers.frameOptions(frame -> frame.disable()))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .anonymous(
                        anon ->
                                anon.principal("dev-patient")
                                        .authorities(List.of(new SimpleGrantedAuthority("ROLE_PATIENT"))));
        return http.build();
    }
}
