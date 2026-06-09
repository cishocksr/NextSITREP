package com.veteransconnect.dto;

import com.veteransconnect.model.enums.BranchOfService;

import java.util.UUID;

/**
 * DTO returned by both /auth/register and /auth/login.
 *
 * Includes:
 *   - expiresIn: how many milliseconds until the token expires
 *   - basic user info so the frontend can personalize the UI immediately
 *     without making a separate GET /users/{id} call right after login
 *
 * The JWT itself is delivered in an HttpOnly cookie, not in this JSON body.
 */
public record AuthResponse(

        long expiresIn,      // token lifetime in milliseconds

        // User info included so the frontend can update the UI right away
        UUID userId,
        String email,
        String firstName,
        String lastName,
        BranchOfService branchOfService,
        String zipCode

) {
    /**
     * Convenience factory for building auth/session responses.
     */
    public static AuthResponse of(long expiresIn,
                                  UUID userId, String email,
                                  String firstName, String lastName,
                                  BranchOfService branchOfService,
                                  String zipCode) {
        return new AuthResponse(expiresIn,
                userId, email, firstName, lastName, branchOfService, zipCode);
    }
}
