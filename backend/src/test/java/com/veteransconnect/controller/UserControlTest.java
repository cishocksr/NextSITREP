package com.veteransconnect.controller;

import com.veteransconnect.dto.UserResponse;
import com.veteransconnect.exception.UserNotFoundException;
import com.veteransconnect.model.enums.BranchOfService;
import com.veteransconnect.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
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
 * SecurityAutoConfiguration is excluded so tests run without a real JWT filter.
 * The SecurityConfiguration @TestConfiguration (in this package) provides a
 * permissive filter chain that allows all requests through.
 */
@WebMvcTest(
        controllers = UserController.class,
        excludeAutoConfiguration = SecurityAutoConfiguration.class
)
@DisplayName("User Controller Tests")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    private UUID testUserId;
    private UserResponse userResponse;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();

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
            when(userService.getUserById(testUserId)).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users/{id}", testUserId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(testUserId.toString()))
                    .andExpect(jsonPath("$.email").value("veteran@example.com"));
        }

        @Test
        @DisplayName("Should return 404 Not Found when user does not exist")
        void shouldReturn404WhenUserNotFound() throws Exception {
            when(userService.getUserById(testUserId))
                    .thenThrow(new UserNotFoundException("User not found with id: " + testUserId));

            mockMvc.perform(get("/api/v1/users/{id}", testUserId))
                    .andExpect(status().isNotFound())
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

            mockMvc.perform(get("/api/v1/users").param("email", "veteran@example.com"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value("veteran@example.com"));
        }

        @Test
        @DisplayName("Should return 404 when email not found")
        void shouldReturn404WhenEmailNotFound() throws Exception {
            when(userService.getUserByEmail("nobody@example.com"))
                    .thenThrow(new UserNotFoundException("User not found with email: nobody@example.com"));

            mockMvc.perform(get("/api/v1/users").param("email", "nobody@example.com"))
                    .andExpect(status().isNotFound());
        }
    }

    // =========================================================
    // GET /api/v1/users?branch={branch}
    // =========================================================

    @Nested
    @DisplayName("GET /api/v1/users?branch={branch}")
    class GetUsersByBranch {

        @Test
        @DisplayName("Should return 200 OK with list of users for a branch")
        void shouldReturn200WithUserList() throws Exception {
            when(userService.getUsersByBranch(BranchOfService.ARMY))
                    .thenReturn(List.of(userResponse));

            mockMvc.perform(get("/api/v1/users").param("branch", "ARMY"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].branchOfService").value("ARMY"));
        }

        @Test
        @DisplayName("Should return 200 OK with empty list when no users in branch")
        void shouldReturn200WithEmptyList() throws Exception {
            when(userService.getUsersByBranch(BranchOfService.SPACE_FORCE))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/v1/users").param("branch", "SPACE_FORCE"))
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
        @DisplayName("Should return 200 OK with list of users for a zip code")
        void shouldReturn200WithUserList() throws Exception {
            when(userService.getUsersByZipCode("12345"))
                    .thenReturn(List.of(userResponse));

            mockMvc.perform(get("/api/v1/users").param("zipCode", "12345"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].zipCode").value("12345"));
        }

        @Test
        @DisplayName("Should return 200 OK with empty list when no users in zip code")
        void shouldReturn200WithEmptyList() throws Exception {
            when(userService.getUsersByZipCode("99999"))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/v1/users").param("zipCode", "99999"))
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
            mockMvc.perform(get("/api/v1/users"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isEmpty());
        }
    }
}
