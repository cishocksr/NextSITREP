package com.veteransconnect.service;

import com.veteransconnect.dto.SaveResourceRequest;
import com.veteransconnect.dto.SavedResourceResponse;
import com.veteransconnect.exception.ResourceAlreadySavedException;
import com.veteransconnect.exception.SavedResourceNotFoundException;
import com.veteransconnect.exception.UserNotFoundException;
import com.veteransconnect.model.SavedResource;
import com.veteransconnect.model.User;
import com.veteransconnect.repository.SavedResourceRepository;
import com.veteransconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Manages a veteran's personal saved resource library.
 *
 * All operations are scoped to the authenticated user.
 * Security enforcement (JWT validation, ownership checks) is handled
 * at the controller level — here we trust that userEmail is the real caller.
 *
 * The ownership check in updateNotes and unsaveResource ensures one veteran
 * cannot modify or delete another veteran's saved resources, even with a valid JWT.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SavedResourceServiceImpl implements SavedResourceService {

    private final SavedResourceRepository savedResourceRepository;
    private final UserRepository userRepository;

    @Override
    public SavedResourceResponse saveResource(String userEmail, SaveResourceRequest request) {
        User user = loadUser(userEmail);

        // Prevent duplicate saves — the unique constraint in the DB also enforces this,
        // but checking here gives us a clean 409 response instead of a database exception
        if (savedResourceRepository.existsByUserAndExternalIdAndSourceApi(
                user, request.externalId(), request.sourceApi())) {
            throw new ResourceAlreadySavedException(
                    "You have already saved this resource: " + request.name());
        }

        SavedResource savedResource = SavedResource.builder()
                .user(user)
                .externalId(request.externalId())
                .sourceApi(request.sourceApi())
                .name(request.name())
                .description(request.description())
                .category(request.category())
                .phone(request.phone())
                .website(request.website())
                .address(request.address())
                .city(request.city())
                .state(request.state())
                .zipCode(request.zipCode())
                .notes(request.notes())
                .build();

        SavedResource saved = savedResourceRepository.save(savedResource);
        log.info("User {} saved resource: {} ({})", userEmail, request.name(), request.externalId());

        return SavedResourceResponse.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavedResourceResponse> getSavedResources(String userEmail) {
        User user = loadUser(userEmail);

        return savedResourceRepository.findByUserOrderBySavedAtDesc(user).stream()
                .map(SavedResourceResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    public SavedResourceResponse updateNotes(String userEmail, UUID savedResourceId, String notes) {
        SavedResource savedResource = loadAndVerifyOwnership(userEmail, savedResourceId);

        // Allow clearing notes by passing null or empty string
        savedResource.setNotes(notes == null || notes.isBlank() ? null : notes);
        SavedResource updated = savedResourceRepository.save(savedResource);

        log.debug("User {} updated notes on saved resource {}", userEmail, savedResourceId);
        return SavedResourceResponse.from(updated);
    }

    @Override
    public void unsaveResource(String userEmail, UUID savedResourceId) {
        SavedResource savedResource = loadAndVerifyOwnership(userEmail, savedResourceId);
        savedResourceRepository.delete(savedResource);
        log.info("User {} unsaved resource {}", userEmail, savedResourceId);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /** Load a user by email, throwing UserNotFoundException if not found. */
    private User loadUser(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UserNotFoundException(
                        "User not found with email: " + userEmail));
    }

    /**
     * Load a saved resource by ID and verify it belongs to this user.
     * Throws SavedResourceNotFoundException if not found OR belongs to someone else.
     * We intentionally don't distinguish between "not found" and "wrong owner" —
     * returning the same error prevents information leakage about other users' libraries.
     */
    private SavedResource loadAndVerifyOwnership(String userEmail, UUID savedResourceId) {
        User user = loadUser(userEmail);

        SavedResource savedResource = savedResourceRepository.findById(savedResourceId)
                .orElseThrow(() -> new SavedResourceNotFoundException(
                        "Saved resource not found: " + savedResourceId));

        // Ownership check — compare user IDs
        if (!savedResource.getUser().getId().equals(user.getId())) {
            // Return the same exception as "not found" to avoid leaking that
            // the resource exists but belongs to a different user
            throw new SavedResourceNotFoundException(
                    "Saved resource not found: " + savedResourceId);
        }

        return savedResource;
    }
}
