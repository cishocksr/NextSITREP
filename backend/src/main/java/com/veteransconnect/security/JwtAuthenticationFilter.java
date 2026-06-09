package com.veteransconnect.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT Authentication Filter — runs once for every incoming HTTP request.
 *
 * This filter sits in Spring Security's filter chain and is responsible for:
 *   1. Checking if the request has a JWT in the session cookie or Authorization header
 *   2. Extracting and validating the token if present
 *   3. Loading the user from the database and setting them in the SecurityContext
 *      so downstream code (controllers, services) knows who the caller is
 *
 * Why OncePerRequestFilter?
 *   Spring's servlet filter chain can potentially invoke a filter multiple times
 *   per request (e.g., during forward/include dispatches). OncePerRequestFilter
 *   guarantees our filter logic runs exactly once per HTTP request.
 *
 * API clients may still use the Authorization header format:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGV4YW1...
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Value("${security.jwt.cookie-name}")
    private String jwtCookieName;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain        // the rest of the filter chain
    ) throws ServletException, IOException {

        // ── Step 1: Read the JWT ──────────────────────────────────────────────
        // Preferred source: HttpOnly cookie. Authorization header is still
        // accepted for API clients and tests.
        final String jwt = resolveToken(request);

        // If there's no token, this request is either public or missing credentials.
        // Either way: skip JWT processing and let SecurityConfig decide.
        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // ── Step 2: Extract the username (email) from the token ────────────
            final String userEmail = jwtService.extractUsername(jwt);

            // ── Step 3: Validate and set the SecurityContext ───────────────────
            // We only proceed if:
            //   a) We successfully extracted an email from the token
            //   b) The user isn't already authenticated in this request
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // Load the full UserDetails from the database using the email in the token.
                // This ensures the user still exists and is active.
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                // Verify: does the token's signature match our secret? Is it expired?
                // Does the email in the token match the user we just loaded?
                if (jwtService.isTokenValid(jwt, userDetails)) {

                    // Create an authentication token that Spring Security understands.
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    // Attach additional request details (IP address, session ID) to the auth token.
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Store the authentication in the SecurityContext for this request.
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException ex) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"message\":\"Invalid or expired token\",\"status\":401}"
            );
            return;
        }

        // ── Step 4: Pass the request to the next filter ────────────────────────
        // Always call this — it continues the filter chain, eventually reaching the controller.
        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (jwtCookieName.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }

        return null;
    }
}
