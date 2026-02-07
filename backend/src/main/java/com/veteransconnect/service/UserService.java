package com.veteransconnect.service;

import com.veteransconnect.dto.UserRegistrationRequest;
import com.veteransconnect.dto.UserResponse;
import com.veteransconnect.model.enums.BranchOfService;

import java.util.List;
import java.util.UUID;

/**
 * Service interface for User business logic operations.
 * Handles user registration, retrieval, and filtering.
 */
public interface UserService {

    /**
     * Register a new user in the system.
     *
     * @param request the user registration data
     * @return the created user as a response DTO
     * @throws com.veteransconnect.exception.DuplicateEmailException if email already exists
     * @throws IllegalArgumentException if branch of service is invalid
     */
    UserResponse registerUser(UserRegistrationRequest request);

    /**
     * Find a user by their unique ID.
     *
     * @param id the user's UUID
     * @return the user as a response DTO
     * @throws com.veteransconnect.exception.UserNotFoundException if user not found
     */
    UserResponse getUserById(UUID id);

    /**
     * Find a user by their email address.
     *
     * @param email the user's email
     * @return the user as a response DTO
     * @throws com.veteransconnect.exception.UserNotFoundException if user not found
     */
    UserResponse getUserByEmail(String email);

    /**
     * Find all users who served in a specific branch of service.
     *
     * @param branch the branch of service to filter by
     * @return list of users (may be empty)
     */
    List<UserResponse> getUsersByBranch(BranchOfService branch);

    /**
     * Find all users in a specific zip code.
     *
     * @param zipCode the 5-digit zip code
     * @return list of users (may be empty)
     */
    List<UserResponse> getUsersByZipCode(String zipCode);
}