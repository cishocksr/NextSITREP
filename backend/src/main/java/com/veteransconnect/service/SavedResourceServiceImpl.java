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

    private User loadUser(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UserNotFoundException(
                        "User not found with email: " + userEmail));
    }

    /**
     * Load a saved resource by ID and verify it belongs to this user.
     */
    private SavedResource loadAndVerifyOwnership(String userEmail, UUID savedResourceId) {
        User user = loadUser(userEmail);

        SavedResource savedResource = savedResourceRepository.findById(savedResourceId)
                .orElseThrow(() -> new SavedResourceNotFoundException(
                        "Saved resource not found: " + savedResourceId));

        if (!savedResource.getUser().getId().equals(user.getId())) {
            throw new SavedResourceNotFoundException(
                    "Saved resource not found: " + savedResourceId);
        }

        return savedResource;
    }
}
