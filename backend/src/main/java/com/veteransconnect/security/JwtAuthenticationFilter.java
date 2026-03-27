package com.veteransconnect.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT Authentication Filter — runs once for every incoming HTTP request.
 *
 * This filter sits in Spring Security's filter chain and is responsible for:
 *   1. Checking if the request has a JWT in the Authorization header
 *   2. Extracting and validating the token if present
 *   3. Loading the user from the database and setting them in the SecurityContext
 *      so downstream code (controllers, services) knows who the caller is
 *
 * Why OncePerRequestFilter?
 *   Spring's servlet filter chain can potentially invoke a filter multiple times
 *   per request (e.g., during forward/include dispatches). OncePerRequestFilter
 *   guarantees our filter logic runs exactly once per HTTP request.
 *
 * The Authorization header format we expect:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGV4YW1...
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain        // the rest of the filter chain
    ) throws ServletException, IOException {

        // ── Step 1: Read the Authorization header ──────────────────────────────
        // Standard format: "Bearer <token>"
        final String authHeader = request.getHeader("Authorization");

        // If there's no Authorization header, or it doesn't start with "Bearer ",
        // this request is either public (login/register) or missing credentials.
        // Either way: skip JWT processing and let the filter chain continue.
        // SecurityConfig decides if the endpoint requires authentication.
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── Step 2: Extract the token from the header ──────────────────────────
        // "Bearer " is 7 characters, so we skip those to get just the token string.
        final String jwt = authHeader.substring(7);

        // ── Step 3: Extract the username (email) from the token ────────────────
        // If the token is malformed or has an invalid signature, extractUsername()
        // will throw a JwtException and the request will get a 403.
        final String userEmail = jwtService.extractUsername(jwt);

        // ── Step 4: Validate and set the SecurityContext ───────────────────────
        // We only proceed if:
        //   a) We successfully extracted an email from the token
        //   b) The user isn't already authenticated in this request
        //      (SecurityContextHolder.getContext().getAuthentication() == null means not yet set)
        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            // Load the full UserDetails from the database using the email in the token.
            // This ensures the user still exists and is active.
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

            // Verify: does the token's signature match our secret? Is it expired?
            // Does the email in the token match the user we just loaded?
            if (jwtService.isTokenValid(jwt, userDetails)) {

                // Create an authentication token that Spring Security understands.
                // The three arguments are: principal (who), credentials (null for JWT — no password needed),
                // and authorities (roles/permissions for this user).
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,                           // no credentials needed — JWT is the proof
                                userDetails.getAuthorities()    // roles (e.g., ROLE_VETERAN)
                        );

                // Attach additional request details (IP address, session ID) to the auth token.
                // Not required, but useful for auditing and security monitoring.
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Store the authentication in the SecurityContext for this request.
                // From this point on, any code in this request can call
                // SecurityContextHolder.getContext().getAuthentication() to get the logged-in user.
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // ── Step 5: Pass the request to the next filter ────────────────────────
        // Always call this — it continues the filter chain, eventually reaching the controller.
        filterChain.doFilter(request, response);
    }
}
