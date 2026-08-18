package com.veteransconnect.dto;

import com.veteransconnect.model.SavedResource;
import com.veteransconnect.model.enums.ResourceCategory;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for a saved resource in the veteran's personal library.
 */
public record SavedResourceResponse(

        UUID id,
        String externalId,
        String sourceApi,
        String name,
        String description,
        ResourceCategory category,
        String phone,
        String website,
        String address,
        String city,
        String state,
        String zipCode,
        String notes,
        LocalDateTime savedAt,
        LocalDateTime updatedAt

) {
    public static SavedResourceResponse from(SavedResource savedResource) {
        return new SavedResourceResponse(
                savedResource.getId(),
                savedResource.getExternalId(),
                savedResource.getSourceApi(),
                savedResource.getName(),
                savedResource.getDescription(),
                savedResource.getCategory(),
                savedResource.getPhone(),
                savedResource.getWebsite(),
                savedResource.getAddress(),
                savedResource.getCity(),
                savedResource.getState(),
                savedResource.getZipCode(),
                savedResource.getNotes(),
                savedResource.getSavedAt(),
                savedResource.getUpdatedAt()
        );
    }
}
