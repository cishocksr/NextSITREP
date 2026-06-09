package com.veteransconnect.controller;

import com.veteransconnect.dto.AuthResponse;
import com.veteransconnect.dto.LoginRequest;
import com.veteransconnect.dto.UserRegistrationRequest;
import com.veteransconnect.dto.UserResponse;
import com.veteransconnect.security.AuthRateLimiter;
import com.veteransconnect.security.JwtService;
import com.veteransconnect.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.Duration;

/**
 * Handles all authentication-related endpoints.
 *
 * These endpoints are public — no JWT required — because they're how
 * users get a JWT in the first place. The SecurityConfig.securityFilterChain()
 * method has .requestMatchers("/api/v1/auth/**").permitAll() which covers these.
 *
 * Endpoints:
 *   POST /api/v1/auth/register  — create an account, returns JWT
 *   POST /api/v1/auth/login     — authenticate, returns JWT
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final AuthenticationManager authenticationManager;
    private final AuthRateLimiter authRateLimiter;

    @Value("${security.jwt.cookie-name}")
    private String jwtCookieName;

    @Value("${security.jwt.cookie-secure}")
    private boolean jwtCookieSecure;

    @Value("${security.jwt.cookie-same-site}")
    private String jwtCookieSameSite;

    // =========================================================
    // POST /api/v1/auth/register
    // =========================================================

    /**
     * Register a new veteran account and return a JWT so the user is
     * immediately logged in after signing up (no separate login step needed).
     *
     * Flow:
     *   1. Validate the request body (@Valid)
     *   2. Create the user in the database (password is BCrypt-hashed in the service)
     *   3. Load the saved user as UserDetails
     *   4. Generate a JWT
     *   5. Return AuthResponse with the token and user info
     *
     * @return 201 Created with token and user info
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody UserRegistrationRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        authRateLimiter.checkAllowed(httpRequest, "register", request.email());

        // Create the user — UserServiceImpl hashes the password before saving
       UserResponse user = userService.registerUser(request);

        // Load the saved user as a UserDetails object for JWT generation.
        // We use the email as the login identifier.
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.email());

        // Generate a JWT for the newly registered user
        String token = jwtService.generateToken(userDetails);
        addAuthCookie(httpResponse, token);

        // Load the full user entity so we can include info in the response


        AuthResponse authResponse = AuthResponse.of(
                jwtService.getExpirationMs(),
                user.id(),
                user.email(),
                user.firstName(),
                user.lastName(),
                user.branchOfService(),
                user.zipCode()
        );

        // 201 Created — a new resource (the user) was created
        return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
    }

    // =========================================================
    // POST /api/v1/auth/login
    // =========================================================

    /**
     * Authenticate an existing user and return a JWT.
     *
     * Flow:
     *   1. Validate the request body (@Valid)
     *   2. Call authenticationManager.authenticate() with the credentials
     *      — this internally calls CustomUserDetailsService.loadUserByUsername(email)
     *      — then BCryptPasswordEncoder.matches(provided, stored)
     *      — if the password is wrong, it throws BadCredentialsException → 401
     *   3. If authentication succeeds, generate a JWT
     *   4. Return AuthResponse with the token and user info
     *
     * @return 200 OK with token and user info on success,
     *         401 Unauthorized if credentials are wrong (handled by GlobalExceptionHandler)
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        authRateLimiter.checkAllowed(httpRequest, "login", request.email());

        // authenticate() will throw AuthenticationException (→ 401) if credentials are wrong.
        // The GlobalExceptionHandler catches that and returns a clean error response.
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );

        // If we reach here, authentication succeeded.
        // Load the UserDetails to generate the JWT.
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.email());
        String token = jwtService.generateToken(userDetails);
        addAuthCookie(httpResponse, token);

        // Load the full entity for the response payload
       UserResponse user = userService.getUserByEmail(request.email());

        AuthResponse authResponse = AuthResponse.of(
                jwtService.getExpirationMs(),
                user.id(),
                user.email(),
                user.firstName(),
                user.lastName(),
                user.branchOfService(),
                user.zipCode()
        );

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        clearAuthCookie(response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(Principal principal) {
        UserResponse user = userService.getUserByEmail(principal.getName());

        return ResponseEntity.ok(AuthResponse.of(
                jwtService.getExpirationMs(),
                user.id(),
                user.email(),
                user.firstName(),
                user.lastName(),
                user.branchOfService(),
                user.zipCode()
        ));
    }

    private void addAuthCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from(jwtCookieName, token)
                .httpOnly(true)
                .secure(jwtCookieSecure)
                .sameSite(jwtCookieSameSite)
                .path("/")
                .maxAge(Duration.ofMillis(jwtService.getExpirationMs()))
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearAuthCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(jwtCookieName, "")
                .httpOnly(true)
                .secure(jwtCookieSecure)
                .sameSite(jwtCookieSameSite)
                .path("/")
                .maxAge(Duration.ZERO)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
