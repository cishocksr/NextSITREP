package com.veteransconnect.controller;

import com.veteransconnect.dto.UserResponse;
import com.veteransconnect.model.enums.BranchOfService;
import com.veteransconnect.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * Handles user lookup/query endpoints.
 *
 * Registration and login have moved to AuthController (/api/v1/auth/*)
 * because those are auth operations — they're the ones that hand out JWTs.
 *
 * All endpoints here require a valid JWT (configured in SecurityConfig).
 * Browser clients authenticate with the HttpOnly session cookie issued by
 * AuthController. API clients may still send Authorization: Bearer <token>.
 *
 * Base path: /api/v1/users
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // =========================================================
    // GET /api/v1/users/{id}
    // =========================================================

    // @PathVariable binds the {id} URL segment to the method parameter.
    // Spring automatically converts the String "id" to UUID.
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id, Principal principal) {
        UserResponse currentUser = userService.getUserByEmail(principal.getName());
        if (!currentUser.id().equals(id)) {
            throw new AccessDeniedException("Cannot access another user's profile");
        }

        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(response);
    }

    // =========================================================
    // GET /api/v1/users?email={email}
    // GET /api/v1/users?branch={branch}
    // GET /api/v1/users?zipCode={zipCode}
    // =========================================================

    // A single GET endpoint handles three optional query params.
    // This keeps URLs clean and avoids redundant route definitions.
    // Priority order if multiple are somehow provided: email → branch → zipCode
    @GetMapping
    public ResponseEntity<?> getUsers(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) BranchOfService branch,
            @RequestParam(required = false) String zipCode,
            Principal principal) {

        UserResponse currentUser = userService.getUserByEmail(principal.getName());

        if (email != null) {
            if (!currentUser.email().equalsIgnoreCase(email.trim())) {
                throw new AccessDeniedException("Cannot access another user's profile");
            }
            return ResponseEntity.ok(currentUser);
        }

        if (branch != null) {
            return ResponseEntity.ok(
                    currentUser.branchOfService() == branch ? List.of(currentUser) : List.of()
            );
        }

        // getUsersByZipCode is now properly exposed (previously implemented in service
        // but missing from this controller)
        if (zipCode != null) {
            return ResponseEntity.ok(
                    currentUser.zipCode().equals(zipCode.trim()) ? List.of(currentUser) : List.of()
            );
        }

        // No query params — return empty list rather than an error
        return ResponseEntity.ok(List.of());
    }
}
