package com.veteransconnect.dto;

import com.veteransconnect.model.enums.ResourceCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request body for saving a resource to the veteran's personal library.
 *
 * The frontend sends this after the veteran clicks "Save" on a search result.
 * We store all the resource data here (not just the ID) so the saved resource
 * is viewable even if the external API is unavailable.
 *
 * The optional `notes` field lets the veteran add context immediately on save.
 * They can always update notes later via PATCH /api/v1/saved-resources/{id}/notes.
 */
public record SaveResourceRequest(

        @NotBlank(message = "External ID is required")
        String externalId,

        // Which API this resource came from — "VA_FACILITIES" for now
        @NotBlank(message = "Source API is required")
        String sourceApi,

        @NotBlank(message = "Resource name is required")
        String name,

        String description,

        @NotNull(message = "Category is required")
        ResourceCategory category,

        String phone,
        String website,
        String address,
        String city,
        String state,
        String zipCode,

        // Optional initial notes — veteran can add context right when saving
        @Size(max = 5000, message = "Notes cannot exceed 5000 characters")
        String notes

) {}
