package com.veteransconnect.dto;

import com.veteransconnect.model.enums.ResourceCategory;

/**
 * A single resource returned from a search.
 *
 * This is a normalized DTO — regardless of which external API the data
 * came from (VA Facilities, future APIs), everything gets shaped into
 * this common format before going to the frontend.
 *
 * externalId + sourceApi together are what you pass to
 * POST /api/v1/saved-resources when a veteran wants to save this result.
 *
 * isSaved tells the frontend whether to show a "saved" indicator so the
 * veteran knows at a glance which results they've already bookmarked.
 */
public record ResourceSearchResult(

        // The ID this resource has in the external API (e.g. "vha_689")
        String externalId,

        // Which API this came from (e.g. "VA_FACILITIES")
        // Allows the frontend to know the source and the save endpoint to store it
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

        // Distance from the searched zip code in miles, rounded to 1 decimal
        Double distanceMiles,

        // Has the currently authenticated veteran already saved this resource?
        boolean isSaved

) {}
