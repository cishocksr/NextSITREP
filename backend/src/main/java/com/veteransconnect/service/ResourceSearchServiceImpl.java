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
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceSearchServiceImpl implements ResourceSearchService {

    private final GeocodingService geocodingService;
    private final VaFacilitiesClient vaFacilitiesClient;
    private final SavedResourceRepository savedResourceRepository;
    private final UserRepository userRepository;

    private static final int DEFAULT_RADIUS_MILES = 50;
    private static final int MIN_RADIUS_MILES = 1;
    private static final int MAX_RADIUS_MILES = 100;

    @Override
    @Transactional(readOnly = true)
    public List<ResourceSearchResult> search(
            String zipCode,
            ResourceCategory category,
            String keyword,
            Integer radiusMiles,
            String userEmail) {

        String normalizedZipCode = GeocodingService.normalizeZipCode(zipCode);
        int radius = normalizeRadius(radiusMiles);
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();

        log.info("Resource search: zipCode={}, category={}, keyword={}, radius={}mi",
                normalizedZipCode, category, normalizedKeyword, radius);

        GeocodingService.Coordinates coords =
                geocodingService.getCoordinatesForZipCode(normalizedZipCode);

        List<String> facilityTypesToSearch = getFacilityTypesToSearch(category);
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

        Set<String> savedExternalIds = getSavedExternalIds(userEmail);

        return vaFacilities.stream()
                .filter(facility -> matchesKeyword(facility, normalizedKeyword))
                .map(facility -> toSearchResult(facility, category, savedExternalIds))
                .sorted(java.util.Comparator.comparingDouble(r ->
                        r.distanceMiles() != null ? r.distanceMiles() : Double.MAX_VALUE))
                .collect(Collectors.toList());
    }

    private List<String> getFacilityTypesToSearch(ResourceCategory category) {
        if (category == null) {
            return Arrays.asList("health", "benefits", "vet_center");
        }
        return List.of(category.getVaFacilityType());
    }

    private int normalizeRadius(Integer radiusMiles) {
        if (radiusMiles == null) {
            return DEFAULT_RADIUS_MILES;
        }

        if (radiusMiles < MIN_RADIUS_MILES || radiusMiles > MAX_RADIUS_MILES) {
            throw new IllegalArgumentException(
                    "Radius must be between " + MIN_RADIUS_MILES + " and " + MAX_RADIUS_MILES + " miles");
        }

        return radiusMiles;
    }

    /**
     * Returns true if the facility matches the keyword, or if no keyword was given.
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

    private ResourceSearchResult toSearchResult(
            VaFacilitiesClient.VaFacility facility,
            ResourceCategory requestedCategory,
            Set<String> savedExternalIds) {

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

    private ResourceCategory mapVaTypeToCategory(String facilityType) {
        if (facilityType == null) return ResourceCategory.BENEFITS;
        return switch (facilityType) {
            case "va_health_facility"    -> ResourceCategory.HEALTHCARE;
            case "vet_center"            -> ResourceCategory.VET_CENTER;
            default                      -> ResourceCategory.BENEFITS;
        };
    }

    private Set<String> getSavedExternalIds(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .map(user -> savedResourceRepository.findByUser(user).stream()
                        .map(saved -> saved.getExternalId())
                        .collect(Collectors.toSet()))
                .orElse(Set.of());
    }
}
