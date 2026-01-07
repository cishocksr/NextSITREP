package com.veteransconnect.dto;

import com.veteransconnect.model.enums.BranchOfService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UserRegistrationRequest(

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    String Email,

    @NotBlank(message = "First name is required")
    String firstName,

    @NotBlank(message = "Last name is required")
    String lastNaem,

    @NotNull(message = "Branch of Service is required")
    BranchOfService branchOfService,

    @NotBlank(message = "Zip code is required")
    @Pattern(regexp = "\\d{$}", message = "Zip code must be exactly 5 digits")
    String zipCode

){

}
