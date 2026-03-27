package com.veteransconnect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO for login requests.
 *
 * Using a Java record keeps this concise — records are immutable,
 * give us a constructor, getters, equals, hashCode, and toString for free.
 *
 * @Valid in the controller will trigger the @NotBlank / @Email checks
 * before our code runs, so we never receive a null or malformed email.
 */
public record LoginRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Must be a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        String password

) {}
