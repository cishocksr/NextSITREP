package com.veteransconnect.config;

import com.veteransconnect.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Central Spring Security configuration.
 *
 * This class does four main things:
 *   1. Defines which endpoints are public and which require a valid JWT
 *   2. Configures CORS so our React frontend (localhost:3000) can call the API
 *   3. Wires up JWT-based stateless authentication (no server-side sessions)
 *   4. Provides reusable beans: PasswordEncoder, AuthenticationManager, etc.
 *
 * Key concepts:
 *   - @Configuration tells Spring this class contains bean definitions.
 *   - @EnableWebSecurity activates Spring Security for this application.
 *   - @Bean methods register objects in the Spring IoC container so they can
 *     be injected anywhere with @Autowired / @RequiredArgsConstructor.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    // Reads cors.allowed-origins from application.properties, which in turn
    // reads CORS_ALLOWED_ORIGINS from the environment (set in docker-compose or .env).
    // Supports comma-separated origins: "http://localhost:3000,https://veteransconnect.org"
    @Value("${cors.allowed-origins}")
    private String[] allowedOrigins;

    // =========================================================
    // MAIN SECURITY FILTER CHAIN
    // =========================================================

    /**
     * Defines the complete security policy for every HTTP request.
     *
     * Think of this as "the rulebook" — it answers:
     *   - Which URLs are open to the public?
     *   - Which require authentication?
     *   - How does the app handle sessions?
     *   - What filters run before the request hits the controller?
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ── CSRF ─────────────────────────────────────────────────────────
            // CSRF (Cross-Site Request Forgery) protection is built for
            // browser-based apps that use session cookies.
            // Since our API is stateless (JWT, no cookies), CSRF doesn't apply —
            // we disable it to keep things clean.
            .csrf(AbstractHttpConfigurer::disable)

            // ── CORS ─────────────────────────────────────────────────────────
            // Apply our corsConfigurationSource bean (defined below).
            // This allows the React frontend at localhost:3000 to call our API.
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // ── AUTHORIZATION RULES ──────────────────────────────────────────
            // These rules are evaluated top-to-bottom; the first match wins.
            .authorizeHttpRequests(auth -> auth
                // Public endpoints — anyone can call these without a token:
                //   POST /api/v1/auth/register  — create an account
                //   POST /api/v1/auth/login     — get a JWT
                .requestMatchers(
                        "/api/v1/auth/register",
                        "/api/v1/auth/login",
                        "/api/v1/auth/logout"
                ).permitAll()
                .requestMatchers("/actuator/health").permitAll()

                // Every other request requires a valid JWT.
                // If no token (or an invalid one) is provided, Spring returns 401.
                .anyRequest().authenticated()
            )

            // ── AUTH FAILURE RESPONSES ────────────────────────────────────────
            // Return predictable JSON for missing/invalid tokens instead of
            // Spring Security's default blank/html error responses.
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write(
                            "{\"message\":\"Authentication required\",\"status\":401}"
                    );
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write(
                            "{\"message\":\"Access denied\",\"status\":403}"
                    );
                })
            )

            // ── SESSION MANAGEMENT ───────────────────────────────────────────
            // STATELESS means Spring will NEVER create an HTTP session.
            // All authentication state lives in the JWT — the server remembers nothing.
            // This is the right choice for a REST API consumed by a React frontend.
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // ── AUTHENTICATION PROVIDER ──────────────────────────────────────
            // Tell Spring Security how to load users and verify passwords.
            // Our DaoAuthenticationProvider uses our CustomUserDetailsService + BCrypt.
            .authenticationProvider(authenticationProvider())

            // ── JWT FILTER ───────────────────────────────────────────────────
            // Insert our JWT filter BEFORE Spring's default username/password filter.
            // This way, every request is checked for a JWT before any other
            // authentication mechanism runs.
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

            // ── SECURITY HEADERS ─────────────────────────────────────────────
            // These are cheap browser-side protections for the API responses.
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
                ))
                .frameOptions(frameOptions -> frameOptions.deny())
                .referrerPolicy(referrer -> referrer.policy(
                        ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER
                ))
                .httpStrictTransportSecurity(hsts -> hsts
                        .includeSubDomains(true)
                        .maxAgeInSeconds(31536000)
                )
                .cacheControl(cache -> {})
            );

        return http.build();
    }

    // =========================================================
    // CORS CONFIGURATION
    // =========================================================

    /**
     * Configure Cross-Origin Resource Sharing (CORS).
     *
     * CORS is a browser security feature that blocks frontend JavaScript
     * from calling APIs on a different origin (domain:port) by default.
     *
     * Our setup:
     *   - Allows the React dev server at localhost:3000
     *   - Allows the standard HTTP methods REST APIs use
     *   - Allows the Authorization header for API clients
     *   - Allows credentials if needed
     *
     * For production you would replace "http://localhost:3000" with
     * your actual frontend domain (e.g., "https://veteransconnect.org").
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Origins are injected from the CORS_ALLOWED_ORIGINS environment variable.
        // Local dev: http://localhost:3000 (Next.js dev server)
        // Production: your real domain, e.g. https://veteransconnect.org
        config.setAllowedOrigins(
                Arrays.stream(allowedOrigins)
                        .map(String::trim)
                        .filter(origin -> !origin.isBlank())
                        .toList()
        );

        // Standard REST methods
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Allow all standard headers plus Authorization for non-browser API clients
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));

        // Allow the frontend to send/receive the HttpOnly session cookie
        config.setAllowCredentials(true);

        config.setMaxAge(3600L);

        // Apply this CORS policy to every URL in the application
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // =========================================================
    // AUTHENTICATION BEANS
    // =========================================================

    /**
     * DaoAuthenticationProvider ties together:
     *   1. UserDetailsService — how to load a user from the database
     *   2. PasswordEncoder   — how to verify the password
     *
     * When a login attempt comes in, Spring calls:
     *   provider.authenticate(new UsernamePasswordAuthenticationToken(email, password))
     * The provider loads the user, then does:
     *   passwordEncoder.matches(providedPassword, storedHash)
     * If that returns true, authentication succeeds.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * The AuthenticationManager is the main entry point for authentication.
     * Our AuthController will call authManager.authenticate(...) during login.
     * Spring Boot auto-configures it based on our AuthenticationProvider above,
     * so we just expose it as a bean here.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * BCryptPasswordEncoder — the industry standard for hashing passwords.
     *
     * BCrypt is deliberately slow (it uses a "work factor" of 10 by default),
     * which makes brute-force attacks impractical even if your database leaks.
     *
     * NEVER store plaintext passwords. Always hash → store, and use
     * passwordEncoder.matches(plaintext, hash) to verify. Never decrypt.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
