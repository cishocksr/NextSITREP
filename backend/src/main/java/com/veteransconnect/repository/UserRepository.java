package com.veteransconnect.repository;

import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for User entity database operations.
 * Spring Data JPA automatically provides implementation.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    /**
     * Find user by email address.
     * Used for authentication and checking email uniqueness.
     *
     * @param email the email address to search for
     * @return Optional containing the user if found, empty otherwise
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if a user with the given email already exists.
     * Used to prevent duplicate email registrations.
     *
     * @param email the email address to check
     * @return true if a user with this email exists, false otherwise
     */
    boolean existsByEmail(String email);
    /**
     * Find all users who served in a specific branch of military service.
     *
     * @param branch the branch of service to filter by
     * @return list of users in the specified branch (empty if none found)
     */
    List<User> findByBranchOfService(BranchOfService branch);
    /**
     * Find all users in a specific zip code area.
     * Used for geographic resource matching.
     *
     * @param zipCode the 5-digit US zip code
     * @return list of users in the specified zip code (empty if none found)
     */
    List<User> findByZipCode(String zipCode);

}

