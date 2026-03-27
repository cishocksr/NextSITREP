package com.veteransconnect.dto;

import com.veteransconnect.model.enums.BranchOfService;

import java.util.UUID;

/**
 * DTO returned by both /auth/register and /auth/login.
 *
 * Includes:
 *   - the JWT token the client must store and send with future requests
 *   - tokenType ("Bearer") so the client knows how to format the header:
 *       Authorization: Bearer <token>
 *   - expiresIn: how many milliseconds until the token expires
 *   - basic user info so the frontend can personalize the UI immediately
 *     without making a separate GET /users/{id} call right after login
 */
public record AuthResponse(

        String token,
        String tokenType,    // always "Bearer" for JWT
        long expiresIn,      // token lifetime in milliseconds

        // User info included so the frontend can update the UI right away
        UUID userId,
        String email,
        String firstName,
        String lastName,
        BranchOfService branchOfService

) {
    /**
     * Convenience factory — token type is always "Bearer" so we
     * don't make callers pass that constant every time.
     */
    public static AuthResponse of(String token, long expiresIn,
                                  UUID userId, String email,
                                  String firstName, String lastName,
                                  BranchOfService branchOfService) {
        return new AuthResponse(token, "Bearer", expiresIn,
                userId, email, firstName, lastName, branchOfService);
    }
}
