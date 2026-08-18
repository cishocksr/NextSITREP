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
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id, Principal principal) {
        UserResponse currentUser = userService.getUserByEmail(principal.getName());
        if (!currentUser.id().equals(id)) {
            throw new AccessDeniedException("Cannot access another user's profile");
        }

        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(response);
    }

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

        if (zipCode != null) {
            return ResponseEntity.ok(
                    currentUser.zipCode().equals(zipCode.trim()) ? List.of(currentUser) : List.of()
            );
        }

        return ResponseEntity.ok(List.of());
    }
}
