package com.veteransconnect.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.veteransconnect.dto.AuthResponse;
import com.veteransconnect.dto.UserResponse;
import com.veteransconnect.dto.LoginRequest;
import com.veteransconnect.dto.UserRegistrationRequest;
import com.veteransconnect.exception.RateLimitExceededException;
import com.veteransconnect.model.enums.BranchOfService;
import com.veteransconnect.security.AuthRateLimiter;
import com.veteransconnect.security.JwtService;
import com.veteransconnect.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Unit tests for AuthController.
 *
 * Tests the register and login endpoints in isolation from real authentication.
 * Security is excluded via SecurityAutoConfiguration so we test controller
 * logic without needing valid JWTs in the test requests.
 */
@WebMvcTest(
        controllers = AuthController.class,
        excludeAutoConfiguration = SecurityAutoConfiguration.class
)
@DisplayName("Auth Controller Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserService userService;


    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private AuthenticationManager authenticationManager;

    @MockitoBean
    private AuthRateLimiter authRateLimiter;

    private UUID testUserId;
    private UserRegistrationRequest validRegisterRequest;
    private LoginRequest validLoginRequest;
    private UserResponse testUserResponse;
    private UserDetails mockUserDetails;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();

        validRegisterRequest = new UserRegistrationRequest(
                "veteran@example.com",
                "John",
                "Doe",
                BranchOfService.ARMY,
                "12345",
                "SecurePass123"
        );

        validLoginRequest = new LoginRequest(
                "veteran@example.com",
                "SecurePass123"
        );

        testUserResponse = new UserResponse(
                testUserId,
                "veteran@example.com",
                "John",
                "Doe",
                BranchOfService.ARMY,
                "12345",
                null,
                null
        );

        // A simple Spring Security UserDetails that represents our test user
        mockUserDetails = org.springframework.security.core.userdetails.User.builder()
                .username("veteran@example.com")
                .password("$2a$10$hashedpasswordhere")
                .roles("VETERAN")
                .build();
    }

    // =========================================================
    // POST /api/v1/auth/register
    // =========================================================

    @Nested
    @DisplayName("POST /api/v1/auth/register")
    class Register {

        @Test
        @DisplayName("Should return 201 Created with session cookie on successful registration")
        void shouldReturn201OnSuccess() throws Exception {
            // Given — wire up all the mocks the controller will call
            when(userDetailsService.loadUserByUsername("veteran@example.com"))
                    .thenReturn(mockUserDetails);
            when(jwtService.generateToken(any(UserDetails.class))).thenReturn("mock.jwt.token");
            when(jwtService.getExpirationMs()).thenReturn(86400000L);
            when(userService.registerUser(any(UserRegistrationRequest.class)))
                    .thenReturn(testUserResponse);

            // When & Then
            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRegisterRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("vc_session=mock.jwt.token")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                    .andExpect(jsonPath("$.token").doesNotExist())
                    .andExpect(jsonPath("$.email").value("veteran@example.com"))
                    .andExpect(jsonPath("$.firstName").value("John"))
                    .andExpect(jsonPath("$.zipCode").value("12345"));
        }

        @Test
        @DisplayName("Should return 400 Bad Request when email is invalid")
        void shouldReturn400WhenEmailIsInvalid() throws Exception {
            UserRegistrationRequest badRequest = new UserRegistrationRequest(
                    "not-an-email",
                    "John", "Doe",
                    BranchOfService.ARMY,
                    "12345",
                    "SecurePass123"
            );

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 Bad Request when password is too short")
        void shouldReturn400WhenPasswordTooShort() throws Exception {
            UserRegistrationRequest badRequest = new UserRegistrationRequest(
                    "veteran@example.com",
                    "John", "Doe",
                    BranchOfService.ARMY,
                    "12345",
                    "short"   // less than 8 characters — fails @Size(min = 8)
            );

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 Bad Request when zip code format is invalid")
        void shouldReturn400WhenZipCodeIsInvalid() throws Exception {
            UserRegistrationRequest badRequest = new UserRegistrationRequest(
                    "veteran@example.com",
                    "John", "Doe",
                    BranchOfService.ARMY,
                    "ABCDE",   // fails @Pattern(regexp = "\\d{5}")
                    "SecurePass123"
            );

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest());
        }
    }

    // =========================================================
    // POST /api/v1/auth/login
    // =========================================================

    @Nested
    @DisplayName("POST /api/v1/auth/login")
    class Login {

        @Test
        @DisplayName("Should return 200 OK with session cookie on successful login")
        void shouldReturn200OnSuccess() throws Exception {
            // Given — mock successful authentication and token generation
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(new UsernamePasswordAuthenticationToken(
                            mockUserDetails, null, mockUserDetails.getAuthorities()
                    ));
            when(userDetailsService.loadUserByUsername("veteran@example.com"))
                    .thenReturn(mockUserDetails);
            when(jwtService.generateToken(any(UserDetails.class))).thenReturn("mock.jwt.token");
            when(jwtService.getExpirationMs()).thenReturn(86400000L);
            when(userService.getUserByEmail("veteran@example.com"))
                    .thenReturn(testUserResponse);
            // When & Then
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validLoginRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("vc_session=mock.jwt.token")))
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                    .andExpect(jsonPath("$.token").doesNotExist())
                    .andExpect(jsonPath("$.email").value("veteran@example.com"))
                    .andExpect(jsonPath("$.zipCode").value("12345"));
        }

        @Test
        @DisplayName("Should return 401 Unauthorized when credentials are wrong")
        void shouldReturn401WhenCredentialsAreWrong() throws Exception {
            // Given — authenticationManager throws when credentials are bad
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenThrow(new BadCredentialsException("Bad credentials"));

            // When & Then
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validLoginRequest)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Should return 429 Too Many Requests when login attempts exceed limit")
        void shouldReturn429WhenLoginRateLimitExceeded() throws Exception {
            doThrow(new RateLimitExceededException("Too many authentication attempts. Please wait and try again."))
                    .when(authRateLimiter).checkAllowed(any(), eq("login"), eq("veteran@example.com"));

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validLoginRequest)))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(jsonPath("$.status").value(429));
        }

        @Test
        @DisplayName("Should return 400 Bad Request when email is blank")
        void shouldReturn400WhenEmailIsBlank() throws Exception {
            LoginRequest badRequest = new LoginRequest("", "SecurePass123");

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 Bad Request when password is blank")
        void shouldReturn400WhenPasswordIsBlank() throws Exception {
            LoginRequest badRequest = new LoginRequest("veteran@example.com", "");

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/auth/me")
    class CurrentUser {

        @Test
        @DisplayName("Should return 200 OK with current user session")
        void shouldReturnCurrentUser() throws Exception {
            when(jwtService.getExpirationMs()).thenReturn(86400000L);
            when(userService.getUserByEmail("veteran@example.com"))
                    .thenReturn(testUserResponse);

            mockMvc.perform(get("/api/v1/auth/me")
                            .principal(() -> "veteran@example.com"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value("veteran@example.com"))
                    .andExpect(jsonPath("$.firstName").value("John"))
                    .andExpect(jsonPath("$.zipCode").value("12345"))
                    .andExpect(jsonPath("$.token").doesNotExist());
        }
    }
}
