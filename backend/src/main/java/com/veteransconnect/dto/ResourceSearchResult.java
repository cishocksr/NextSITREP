package com.veteransconnect.dto;

import com.veteransconnect.model.enums.ResourceCategory;

/**
 * A single resource returned from a search.
 */
public record ResourceSearchResult(

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
        Double distanceMiles,
        boolean isSaved

) {}
