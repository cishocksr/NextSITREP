package com.veteransconnect.dto;

import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        BranchOfService branchOfService,
        String zipCode,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static UserResponse from (User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getBranchOfService(),
                user.getZipCode(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
