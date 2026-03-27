package com.veteransconnect.dto;

import com.veteransconnect.model.enums.BranchOfService;
import jakarta.validation.constraints.*;

public record UserRegistrationRequest(

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    String email,

    @NotBlank(message = "First name is required")
    String firstName,

    @NotBlank(message = "Last name is required")
    String lastName,

    @NotNull(message = "Branch of Service is required")
    BranchOfService branchOfService,

    @NotBlank(message = "Zip code is required")
    @Pattern(regexp = "\\d{5}", message = "Zip code must be exactly 5 digits")
    String zipCode,

    // Password is collected at registration and immediately BCrypt-hashed.
    // We enforce a minimum length of 8 characters here so weak passwords
    // are rejected before they ever reach the service layer.
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    String password

) {}
