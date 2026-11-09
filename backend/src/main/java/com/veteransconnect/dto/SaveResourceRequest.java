package com.veteransconnect.dto;

import com.veteransconnect.model.enums.ResourceCategory;
import com.veteransconnect.validation.HttpWebsite;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request body for saving a resource to the veteran's personal library.
 */
public record SaveResourceRequest(

        @NotBlank(message = "External ID is required")
        String externalId,

        @NotBlank(message = "Source API is required")
        String sourceApi,

        @NotBlank(message = "Resource name is required")
        String name,

        String description,

        @NotNull(message = "Category is required")
        ResourceCategory category,

        String phone,
        @HttpWebsite
        String website,
        String address,
        String city,
        String state,
        String zipCode,

        @Size(max = 5000, message = "Notes cannot exceed 5000 characters")
        String notes

) {}
