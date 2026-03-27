package com.veteransconnect.repository;

import com.veteransconnect.model.SavedResource;
import com.veteransconnect.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for SavedResource — Spring Data JPA provides the implementation.
 */
public interface SavedResourceRepository extends JpaRepository<SavedResource, UUID> {

    /**
     * Get all resources saved by a specific user, newest first.
     */
    List<SavedResource> findByUserOrderBySavedAtDesc(User user);

    /**
     * Find a specific saved resource for a user by its external ID and source API.
     * Used to check if the user has already saved something, and to look up a
     * resource for updating notes or unsaving.
     */
    Optional<SavedResource> findByUserAndExternalIdAndSourceApi(
            User user, String externalId, String sourceApi);

    /**
     * Check if a user has already saved a specific external resource.
     * Used to set the "isSaved" flag on search results.
     */
    boolean existsByUserAndExternalIdAndSourceApi(
            User user, String externalId, String sourceApi);

    /**
     * Get all saved resource external IDs for a user.
     * Used efficiently to mark search results as saved without N+1 queries.
     */
    List<SavedResource> findByUser(User user);
}
