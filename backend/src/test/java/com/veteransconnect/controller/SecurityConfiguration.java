package com.veteransconnect.controller;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Test-only security configuration for @WebMvcTest slices.
 *
 * When we use @WebMvcTest, Spring loads only the web layer (controllers).
 * Our real SecurityConfig lives in the main source and references beans
 * (JwtAuthenticationFilter, CustomUserDetailsService) that are not available
 * in the thin @WebMvcTest context.
 *
 * This @TestConfiguration provides a simple, permissive SecurityFilterChain
 * that lets all requests through — perfect for unit-testing controller logic
 * in isolation from authentication.
 *
 * Individual tests that need to simulate authenticated users can use
 * @WithMockUser from spring-security-test.
 */
@TestConfiguration
public class SecurityConfiguration {

    @Bean
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for tests — we are not using cookies
            .csrf(AbstractHttpConfigurer::disable)
            // Allow all requests — controller tests focus on business logic, not auth
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }
}
