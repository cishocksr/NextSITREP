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
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.Duration;

/**
 * Handles account registration, login, logout, session lookup, and CSRF token
 * bootstrap for browser clients.
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

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody UserRegistrationRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        authRateLimiter.checkAllowed(httpRequest, "register", request.email());

        UserResponse user = userService.registerUser(request);

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.email());
        String token = jwtService.generateToken(userDetails);
        addAuthCookie(httpResponse, token);

        AuthResponse authResponse = AuthResponse.of(
                jwtService.getExpirationMs(),
                user.id(),
                user.email(),
                user.firstName(),
                user.lastName(),
                user.branchOfService(),
                user.zipCode()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        authRateLimiter.checkAllowed(httpRequest, "login", request.email());

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.email());
        String token = jwtService.generateToken(userDetails);
        addAuthCookie(httpResponse, token);

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

    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken csrfToken) {
        csrfToken.getToken();
        return ResponseEntity.noContent().build();
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
