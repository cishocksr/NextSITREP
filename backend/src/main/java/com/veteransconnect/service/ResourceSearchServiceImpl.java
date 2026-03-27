package com.veteransconnect.service;

import com.veteransconnect.client.GeocodingService;
import com.veteransconnect.client.VaFacilitiesClient;
import com.veteransconnect.dto.ResourceSearchResult;
import com.veteransconnect.model.enums.ResourceCategory;
import com.veteransconnect.repository.SavedResourceRepository;
import com.veteransconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Orchestrates resource searches across one or more external APIs.
 *
 * Current data sources:
 *   - VA Facilities API (healthcare, benefits, vet centers)
 *
 * Adding a new data source later:
 *   1. Create a new client class in com.veteransconnect.client
 *   2. Inject it here
 *   3. Add a call in the search() method, normalize results, add to the list
 *   No other files need to change — the controller calls this interface,
 *   not individual clients.
 *
 * Flow:
 *   1. Convert zip code → lat/long via GeocodingService (Nominatim)
 *   2. Determine which VA facility type(s) to query based on category filter
 *   3. Call VaFacilitiesClient for each relevant facility type
 *   4. Apply keyword filter if provided
 *   5. Mark results as saved/not-saved for the current user
 *   6. Return sorted by distance
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceSearchServiceImpl implements ResourceSearchService {

    private final GeocodingService geocodingService;
    private final VaFacilitiesClient vaFacilitiesClient;
    private final SavedResourceRepository savedResourceRepository;
    private final UserRepository userRepository;

    // Default search radius if not specified by the caller
    private static final int DEFAULT_RADIUS_MILES = 50;

    @Override
    @Transactional(readOnly = true)
    public List<ResourceSearchResult> search(
            String zipCode,
            ResourceCategory category,
            String keyword,
            Integer radiusMiles,
            String userEmail) {

        int radius = radiusMiles != null ? radiusMiles : DEFAULT_RADIUS_MILES;

        log.info("Resource search: zipCode={}, category={}, keyword={}, radius={}mi",
                zipCode, category, keyword, radius);

        // ── Step 1: Convert zip code to coordinates ────────────────────────────
        GeocodingService.Coordinates coords =
                geocodingService.getCoordinatesForZipCode(zipCode);

        // ── Step 2: Get the VA facility types to query ─────────────────────────
        // If no category is specified, search ALL types.
        // If a category is given, only query its corresponding VA facility type.
        List<String> facilityTypesToSearch = getFacilityTypesToSearch(category);

        // ── Step 3: Query VA Facilities API ────────────────────────────────────
        // We may query multiple types (e.g., "health" and "benefits") and merge results.
        // Using a distinct set of types prevents duplicate API calls when multiple
        // categories map to the same VA type (e.g., EDUCATION and HOUSING both → "benefits")
        List<VaFacilitiesClient.VaFacility> vaFacilities = new ArrayList<>();
        Set<String> queriedTypes = new java.util.LinkedHashSet<>(facilityTypesToSearch);

        for (String facilityType : queriedTypes) {
            List<VaFacilitiesClient.VaFacility> results = vaFacilitiesClient.searchFacilities(
                    coords.latitude(),
                    coords.longitude(),
                    facilityType,
                    radius
            );
            vaFacilities.addAll(results);
            log.debug("VA API returned {} {} facilities", results.size(), facilityType);
        }

        // ── Step 4: Load the user's already-saved external IDs ─────────────────
        // We load all saved resources for this user up front so we can mark
        // search results as saved in a single pass — avoids N+1 database queries.
        Set<String> savedExternalIds = getSavedExternalIds(userEmail);

        // ── Step 5: Normalize, filter, and build results ────────────────────────
        return vaFacilities.stream()
                // Apply keyword filter if provided
                .filter(facility -> matchesKeyword(facility, keyword))
                // Convert VA API format → our normalized ResourceSearchResult
                .map(facility -> toSearchResult(facility, category, savedExternalIds))
                // Sort by distance (closest first)
                .sorted(java.util.Comparator.comparingDouble(r ->
                        r.distanceMiles() != null ? r.distanceMiles() : Double.MAX_VALUE))
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Determine which VA facility types to search based on the requested category.
     *
     * If no category is specified, we search health + benefits + vet_center.
     * Multiple categories can map to the same VA type — the queriedTypes set
     * in the main search() method handles deduplication.
     */
    private List<String> getFacilityTypesToSearch(ResourceCategory category) {
        if (category == null) {
            // No filter — search all types
            return Arrays.asList("health", "benefits", "vet_center");
        }
        return List.of(category.getVaFacilityType());
    }

    /**
     * Returns true if the facility matches the keyword, or if no keyword was given.
     * Case-insensitive match against name and classification.
     */
    private boolean matchesKeyword(VaFacilitiesClient.VaFacility facility, String keyword) {
        if (keyword == null || keyword.isBlank()) return true;

        String lower = keyword.toLowerCase();
        String name = facility.name() != null ? facility.name().toLowerCase() : "";
        String classification = facility.attributes() != null
                && facility.attributes().classification() != null
                ? facility.attributes().classification().toLowerCase() : "";

        return name.contains(lower) || classification.contains(lower);
    }

    /**
     * Convert a VA API facility to our normalized ResourceSearchResult.
     *
     * Maps the VA facility_type string to our ResourceCategory enum.
     * The distance comes from the VA API's meta.distances section,
     * which was attached to each facility by VaFacilitiesClient.
     */
    private ResourceSearchResult toSearchResult(
            VaFacilitiesClient.VaFacility facility,
            ResourceCategory requestedCategory,
            Set<String> savedExternalIds) {

        // Map VA facility type → our category
        ResourceCategory resolvedCategory = requestedCategory != null
                ? requestedCategory
                : mapVaTypeToCategory(facility.facilityType());

        return new ResourceSearchResult(
                facility.id(),
                VaFacilitiesClient.SOURCE_API,
                facility.name(),
                facility.attributes() != null ? facility.attributes().classification() : null,
                resolvedCategory,
                facility.phone(),
                facility.website(),
                facility.address1(),
                facility.city(),
                facility.state(),
                facility.zipCode(),
                facility.distanceMiles(),
                savedExternalIds.contains(facility.id())
        );
    }

    /**
     * Map a VA facility_type string to our ResourceCategory enum.
     * Used when the user searches without a category filter.
     */
    private ResourceCategory mapVaTypeToCategory(String facilityType) {
        if (facilityType == null) return ResourceCategory.BENEFITS;
        return switch (facilityType) {
            case "va_health_facility"    -> ResourceCategory.HEALTHCARE;
            case "vet_center"            -> ResourceCategory.VET_CENTER;
            default                      -> ResourceCategory.BENEFITS;
        };
    }

    /**
     * Load the set of external IDs the current user has already saved.
     * Returns an empty set if the user isn't found (shouldn't happen in practice).
     */
    private Set<String> getSavedExternalIds(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .map(user -> savedResourceRepository.findByUser(user).stream()
                        .map(saved -> saved.getExternalId())
                        .collect(Collectors.toSet()))
                .orElse(Set.of());
    }
}
