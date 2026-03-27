package com.veteransconnect.service;

import com.veteransconnect.client.GeocodingService;
import com.veteransconnect.client.VaFacilitiesClient;
import com.veteransconnect.dto.ResourceSearchResult;
import com.veteransconnect.model.SavedResource;
import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;
import com.veteransconnect.model.enums.ResourceCategory;
import com.veteransconnect.repository.SavedResourceRepository;
import com.veteransconnect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Resource Search Service Tests")
class ResourceSearchServiceTest {

    @Mock private GeocodingService geocodingService;
    @Mock private VaFacilitiesClient vaFacilitiesClient;
    @Mock private SavedResourceRepository savedResourceRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private ResourceSearchServiceImpl resourceSearchService;

    private User testUser;
    private GeocodingService.Coordinates testCoords;
    private VaFacilitiesClient.VaFacility healthFacility;
    private VaFacilitiesClient.VaFacility benefitsFacility;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.ARMY)
                .zipCode("12345")
                .passwordHash("$2a$10$hash")
                .build();

        testCoords = new GeocodingService.Coordinates(40.712, -74.006);

        // Build test VA facility objects using the @JsonCreator factory
        healthFacility = VaFacilitiesClient.VaFacility.create(
                "vha_689",
                new VaFacilitiesClient.VaFacilityAttributes(
                        "VA New York Healthcare",
                        "va_health_facility",
                        "VA Medical Center (VAMC)",
                        new VaFacilitiesClient.VaAddress(
                                new VaFacilitiesClient.VaPhysicalAddress(
                                        "423 East 23rd Street", "New York", "NY", "10010")),
                        new VaFacilitiesClient.VaPhone("212-686-7500"),
                        "https://va.gov/ny"
                )
        ).withDistance(2.5);

        benefitsFacility = VaFacilitiesClient.VaFacility.create(
                "vba_310",
                new VaFacilitiesClient.VaFacilityAttributes(
                        "VA Benefits Office Manhattan",
                        "va_benefits_facility",
                        "Regional Office",
                        new VaFacilitiesClient.VaAddress(
                                new VaFacilitiesClient.VaPhysicalAddress(
                                        "245 W Houston St", "New York", "NY", "10014")),
                        new VaFacilitiesClient.VaPhone("800-827-1000"),
                        "https://va.gov/benefits"
                )
        ).withDistance(3.1);
    }

    @Test
    @DisplayName("Should return healthcare results when searching by HEALTHCARE category")
    void shouldReturnHealthcareResultsForHealthcareCategory() {
        // Given
        when(geocodingService.getCoordinatesForZipCode("10001")).thenReturn(testCoords);
        when(userRepository.findByEmail("veteran@example.com")).thenReturn(Optional.of(testUser));
        when(savedResourceRepository.findByUser(testUser)).thenReturn(List.of());
        when(vaFacilitiesClient.searchFacilities(anyDouble(), anyDouble(), eq("health"), anyInt()))
                .thenReturn(List.of(healthFacility));

        // When
        List<ResourceSearchResult> results = resourceSearchService.search(
                "10001", ResourceCategory.HEALTHCARE, null, null, "veteran@example.com");

        // Then
        assertThat(results).hasSize(1);
        assertThat(results.get(0).externalId()).isEqualTo("vha_689");
        assertThat(results.get(0).category()).isEqualTo(ResourceCategory.HEALTHCARE);
        assertThat(results.get(0).isSaved()).isFalse();
        assertThat(results.get(0).name()).isEqualTo("VA New York Healthcare");

        // Verify only "health" type was queried — not benefits or vet_center
        verify(vaFacilitiesClient, times(1)).searchFacilities(anyDouble(), anyDouble(), eq("health"), anyInt());
        verify(vaFacilitiesClient, never()).searchFacilities(anyDouble(), anyDouble(), eq("benefits"), anyInt());
    }

    @Test
    @DisplayName("Should search all facility types when no category is specified")
    void shouldSearchAllTypesWhenNoCategoryGiven() {
        // Given
        when(geocodingService.getCoordinatesForZipCode("10001")).thenReturn(testCoords);
        when(userRepository.findByEmail("veteran@example.com")).thenReturn(Optional.of(testUser));
        when(savedResourceRepository.findByUser(testUser)).thenReturn(List.of());
        when(vaFacilitiesClient.searchFacilities(anyDouble(), anyDouble(), anyString(), anyInt()))
                .thenReturn(List.of());

        // When
        resourceSearchService.search("10001", null, null, null, "veteran@example.com");

        // Then — all three types should be queried
        verify(vaFacilitiesClient).searchFacilities(anyDouble(), anyDouble(), eq("health"), anyInt());
        verify(vaFacilitiesClient).searchFacilities(anyDouble(), anyDouble(), eq("benefits"), anyInt());
        verify(vaFacilitiesClient).searchFacilities(anyDouble(), anyDouble(), eq("vet_center"), anyInt());
    }

    @Test
    @DisplayName("Should mark results as saved when veteran has already saved them")
    void shouldMarkResultsAsSaved() {
        // Given — the user has already saved healthFacility (vha_689)
        SavedResource alreadySaved = SavedResource.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .externalId("vha_689")
                .sourceApi("VA_FACILITIES")
                .name("VA New York Healthcare")
                .category(ResourceCategory.HEALTHCARE)
                .build();

        when(geocodingService.getCoordinatesForZipCode("10001")).thenReturn(testCoords);
        when(userRepository.findByEmail("veteran@example.com")).thenReturn(Optional.of(testUser));
        when(savedResourceRepository.findByUser(testUser)).thenReturn(List.of(alreadySaved));
        when(vaFacilitiesClient.searchFacilities(anyDouble(), anyDouble(), eq("health"), anyInt()))
                .thenReturn(List.of(healthFacility));

        // When
        List<ResourceSearchResult> results = resourceSearchService.search(
                "10001", ResourceCategory.HEALTHCARE, null, null, "veteran@example.com");

        // Then — the facility the veteran already saved should have isSaved = true
        assertThat(results).hasSize(1);
        assertThat(results.get(0).isSaved()).isTrue();
    }

    @Test
    @DisplayName("Should filter results by keyword (case-insensitive)")
    void shouldFilterByKeyword() {
        // Given — two facilities, keyword only matches the health one
        when(geocodingService.getCoordinatesForZipCode("10001")).thenReturn(testCoords);
        when(userRepository.findByEmail("veteran@example.com")).thenReturn(Optional.of(testUser));
        when(savedResourceRepository.findByUser(testUser)).thenReturn(List.of());
        when(vaFacilitiesClient.searchFacilities(anyDouble(), anyDouble(), eq("health"), anyInt()))
                .thenReturn(List.of(healthFacility));

        // When — keyword "medical" matches the classification "VA Medical Center (VAMC)"
        List<ResourceSearchResult> results = resourceSearchService.search(
                "10001", ResourceCategory.HEALTHCARE, "medical", null, "veteran@example.com");

        // Then — only facilities matching "medical" in name or classification
        assertThat(results).hasSize(1);
        assertThat(results.get(0).externalId()).isEqualTo("vha_689");
    }

    @Test
    @DisplayName("Should return empty list when keyword matches nothing")
    void shouldReturnEmptyWhenKeywordMatchesNothing() {
        when(geocodingService.getCoordinatesForZipCode("10001")).thenReturn(testCoords);
        when(userRepository.findByEmail("veteran@example.com")).thenReturn(Optional.of(testUser));
        when(savedResourceRepository.findByUser(testUser)).thenReturn(List.of());
        when(vaFacilitiesClient.searchFacilities(anyDouble(), anyDouble(), eq("health"), anyInt()))
                .thenReturn(List.of(healthFacility));

        // keyword "dental" doesn't match "VA New York Healthcare" or "VA Medical Center (VAMC)"
        List<ResourceSearchResult> results = resourceSearchService.search(
                "10001", ResourceCategory.HEALTHCARE, "dental", null, "veteran@example.com");

        assertThat(results).isEmpty();
    }

    @Test
    @DisplayName("Should throw GeocodingException when zip code is invalid")
    void shouldThrowWhenZipCodeIsInvalid() {
        when(geocodingService.getCoordinatesForZipCode("00000"))
                .thenThrow(new GeocodingService.GeocodingException(
                        "Could not find coordinates for zip code: 00000"));

        assertThatThrownBy(() -> resourceSearchService.search(
                "00000", null, null, null, "veteran@example.com"))
                .isInstanceOf(GeocodingService.GeocodingException.class)
                .hasMessageContaining("00000");
    }

    @Test
    @DisplayName("Should sort results by distance ascending")
    void shouldSortByDistanceAscending() {
        // Given — two facilities with different distances
        VaFacilitiesClient.VaFacility farFacility = VaFacilitiesClient.VaFacility.create(
                "vha_999",
                new VaFacilitiesClient.VaFacilityAttributes(
                        "Far VA Facility", "va_health_facility", "CBOC",
                        new VaFacilitiesClient.VaAddress(
                                new VaFacilitiesClient.VaPhysicalAddress("100 Main St", "Newark", "NJ", "07101")),
                        new VaFacilitiesClient.VaPhone("973-555-0100"), null)
        ).withDistance(15.0); // farther

        when(geocodingService.getCoordinatesForZipCode("10001")).thenReturn(testCoords);
        when(userRepository.findByEmail("veteran@example.com")).thenReturn(Optional.of(testUser));
        when(savedResourceRepository.findByUser(testUser)).thenReturn(List.of());
        // Return far facility first, then near facility — service should sort them
        when(vaFacilitiesClient.searchFacilities(anyDouble(), anyDouble(), eq("health"), anyInt()))
                .thenReturn(List.of(farFacility, healthFacility)); // far (15.0) before near (2.5)

        // When
        List<ResourceSearchResult> results = resourceSearchService.search(
                "10001", ResourceCategory.HEALTHCARE, null, null, "veteran@example.com");

        // Then — nearest first
        assertThat(results).hasSize(2);
        assertThat(results.get(0).distanceMiles()).isEqualTo(2.5);
        assertThat(results.get(1).distanceMiles()).isEqualTo(15.0);
    }
}
