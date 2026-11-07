package com.veteransconnect.controller;

import com.veteransconnect.dto.UserResponse;
import com.veteransconnect.exception.UserNotFoundException;
import com.veteransconnect.model.enums.BranchOfService;
import com.veteransconnect.security.JwtService;
import com.veteransconnect.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Unit tests for UserController (GET endpoints only).
 *
 * Registration has moved to AuthController (/api/v1/auth/register).
 * See AuthControllerTest for registration endpoint tests.
 *
 * ServletWebSecurityAutoConfiguration is excluded so tests run without a real JWT filter.
 * The SecurityConfiguration @TestConfiguration (in this package) provides a
 * permissive filter chain that allows all requests through.
 */
@WebMvcTest(
        controllers = UserController.class,
        excludeAutoConfiguration = ServletWebSecurityAutoConfiguration.class
)
@DisplayName("User Controller Tests")
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserDetailsService userDetailsService; 

    private UUID testUserId;
    private UUID otherUserId;
    private UserResponse userResponse;
    private final java.security.Principal veteranPrincipal = () -> "veteran@example.com";

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        otherUserId = UUID.randomUUID();

        userResponse = new UserResponse(
                testUserId,
                "veteran@example.com",
                "John",
                "Doe",
                BranchOfService.ARMY,
                "12345",
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    // =========================================================
    // GET /api/v1/users/{id}
    // =========================================================

    @Nested
    @DisplayName("GET /api/v1/users/{id}")
    class GetUserById {

        @Test
        @DisplayName("Should return 200 OK with user data when user found")
        void shouldReturn200WhenUserFound() throws Exception {
            when(userService.getUserByEmail("veteran@example.com")).thenReturn(userResponse);
            when(userService.getUserById(testUserId)).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users/{id}", testUserId)
                            .principal(veteranPrincipal))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(testUserId.toString()))
                    .andExpect(jsonPath("$.email").value("veteran@example.com"));
        }

        @Test
        @DisplayName("Should return 403 Forbidden when requesting another user")
        void shouldReturn403WhenRequestingAnotherUser() throws Exception {
            when(userService.getUserByEmail("veteran@example.com")).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users/{id}", otherUserId)
                            .principal(veteranPrincipal))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").exists());
        }
    }

    // =========================================================
    // GET /api/v1/users?email={email}
    // =========================================================

    @Nested
    @DisplayName("GET /api/v1/users?email={email}")
    class GetUserByEmail {

        @Test
        @DisplayName("Should return 200 OK with user data when email found")
        void shouldReturn200WhenEmailFound() throws Exception {
            when(userService.getUserByEmail("veteran@example.com")).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users")
                            .principal(veteranPrincipal)
                            .param("email", "veteran@example.com"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value("veteran@example.com"));
        }

        @Test
        @DisplayName("Should return 403 when email belongs to another user")
        void shouldReturn403WhenEmailBelongsToAnotherUser() throws Exception {
            when(userService.getUserByEmail("veteran@example.com")).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users")
                            .principal(veteranPrincipal)
                            .param("email", "nobody@example.com"))
                    .andExpect(status().isForbidden());
        }
    }

    // =========================================================
    // GET /api/v1/users?branch={branch}
    // =========================================================

    @Nested
    @DisplayName("GET /api/v1/users?branch={branch}")
    class GetUsersByBranch {

        @Test
        @DisplayName("Should return current user when branch matches")
        void shouldReturnCurrentUserWhenBranchMatches() throws Exception {
            when(userService.getUserByEmail("veteran@example.com")).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users")
                            .principal(veteranPrincipal)
                            .param("branch", "ARMY"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].branchOfService").value("ARMY"));
        }

        @Test
        @DisplayName("Should return empty list when branch does not match current user")
        void shouldReturn200WithEmptyList() throws Exception {
            when(userService.getUserByEmail("veteran@example.com")).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users")
                            .principal(veteranPrincipal)
                            .param("branch", "SPACE_FORCE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isEmpty());
        }
    }

    // =========================================================
    // GET /api/v1/users?zipCode={zipCode}  (previously missing!)
    // =========================================================

    @Nested
    @DisplayName("GET /api/v1/users?zipCode={zipCode}")
    class GetUsersByZipCode {

        @Test
        @DisplayName("Should return current user when zip code matches")
        void shouldReturnCurrentUserWhenZipMatches() throws Exception {
            when(userService.getUserByEmail("veteran@example.com")).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users")
                            .principal(veteranPrincipal)
                            .param("zipCode", "12345"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].zipCode").value("12345"));
        }

        @Test
        @DisplayName("Should return empty list when zip code does not match current user")
        void shouldReturn200WithEmptyList() throws Exception {
            when(userService.getUserByEmail("veteran@example.com")).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users")
                            .principal(veteranPrincipal)
                            .param("zipCode", "99999"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isEmpty());
        }
    }

    // =========================================================
    // GET /api/v1/users (no params)
    // =========================================================

    @Nested
    @DisplayName("GET /api/v1/users (no params)")
    class GetUsersNoParams {

        @Test
        @DisplayName("Should return 200 OK with empty list when no query params provided")
        void shouldReturn200EmptyListWithNoParams() throws Exception {
            when(userService.getUserByEmail("veteran@example.com")).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users")
                            .principal(veteranPrincipal))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isEmpty());
        }
    }
}
