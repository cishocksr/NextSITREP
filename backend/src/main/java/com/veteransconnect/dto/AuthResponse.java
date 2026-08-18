package com.veteransconnect.dto;

import com.veteransconnect.model.enums.BranchOfService;

import java.util.UUID;

/**
 * Session response returned after registration, login, and session lookup.
 */
public record AuthResponse(

        long expiresIn,
        UUID userId,
        String email,
        String firstName,
        String lastName,
        BranchOfService branchOfService,
        String zipCode

) {
    public static AuthResponse of(long expiresIn,
                                  UUID userId, String email,
                                  String firstName, String lastName,
                                  BranchOfService branchOfService,
                                  String zipCode) {
        return new AuthResponse(expiresIn,
                userId, email, firstName, lastName, branchOfService, zipCode);
    }
}
