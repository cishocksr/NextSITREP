package com.veteransconnect.service;

import com.veteransconnect.dto.ResourceSearchResult;
import com.veteransconnect.model.enums.ResourceCategory;

import java.util.List;

/**
 * Defines the contract for searching veteran resources from external APIs.
 *
 * The interface keeps the controller decoupled from the implementation,
 * making it straightforward to swap out or add data sources without
 * touching the controller code.
 */
public interface ResourceSearchService {

    /**
     * Search for veteran resources near a zip code.
     *
     * @param zipCode   5-digit US zip code to center the search around
     * @param category  optional filter by resource category (null returns all types)
     * @param keyword   optional filter results whose name/description contains this text
     * @param radiusMiles how far from the zip code to search (null = use default)
     * @param userEmail the currently authenticated veteran's email,
     *                  used to flag which results they've already saved
     * @return list of matching resources sorted by distance ascending
     */
    List<ResourceSearchResult> search(
            String zipCode,
            ResourceCategory category,
            String keyword,
            Integer radiusMiles,
            String userEmail
    );
}
