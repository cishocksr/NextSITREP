package com.veteransconnect.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * HTTP client for the VA Facilities API (Lighthouse).
 */
@Service
@Slf4j
public class VaFacilitiesClient {

    public static final String SOURCE_API = "VA_FACILITIES";
    private static final Set<String> SUPPORTED_FACILITY_TYPES = Set.of("health", "benefits", "vet_center");
    private static final int PER_PAGE = 20;

    private final RestClient restClient;
    private final String apiKey;

    @Autowired
    public VaFacilitiesClient(
            RestClient.Builder restClientBuilder,
            @Value("${va.api.base-url}") String baseUrl,
            @Value("${va.api.key:}") String apiKey,
            @Value("${va.api.connect-timeout-ms:2000}") int connectTimeoutMs,
            @Value("${va.api.read-timeout-ms:5000}") int readTimeoutMs) {
        this(
                restClientBuilder
                        .requestFactory(requestFactory(connectTimeoutMs, readTimeoutMs))
                        .baseUrl(baseUrl)
                        .defaultHeader("Accept", "application/json")
                        .build(),
                apiKey
        );
    }

    VaFacilitiesClient(RestClient restClient, String apiKey) {
        this.restClient = restClient;
        this.apiKey = apiKey;
    }

    private static SimpleClientHttpRequestFactory requestFactory(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        return factory;
    }

    public List<VaFacility> searchFacilities(
            double latitude,
            double longitude,
            String facilityType,
            int radiusMiles) {

        if (!SUPPORTED_FACILITY_TYPES.contains(facilityType)) {
            throw new IllegalArgumentException("Unsupported VA facility type: " + facilityType);
        }

        log.debug("Searching VA facilities: type={}, lat={}, long={}, radius={}mi",
                facilityType, latitude, longitude, radiusMiles);

        validateApiKey();

        try {
            VaApiResponse response = restClient.get()
                    .uri(uriBuilder -> {
                        var builder = uriBuilder
                                .path("/services/va_facilities/v1/facilities")
                                .queryParam("lat", latitude)
                                .queryParam("long", longitude)
                                .queryParam("radius", radiusMiles)
                                .queryParam("type", facilityType)
                                .queryParam("per_page", PER_PAGE);
                        return builder.build();
                    })
                    .header("apikey", apiKey)
                    .retrieve()
                    .body(VaApiResponse.class);

            if (response == null || response.data() == null) {
                log.warn("VA API returned null/empty response");
                return Collections.emptyList();
            }

            Map<String, Double> distanceMap = Collections.emptyMap();
            if (response.meta() != null && response.meta().distances() != null) {
                distanceMap = response.meta().distances().stream()
                        .filter(d -> d.id() != null)
                        .collect(Collectors.toMap(
                                VaDistance::id,
                                d -> d.distance() != null ? d.distance() : 0.0,
                                (first, ignored) -> first
                        ));
            }

            final Map<String, Double> finalDistanceMap = distanceMap;
            return response.data().stream()
                    .filter(f -> f != null && f.id() != null)
                    .map(f -> f.withDistance(finalDistanceMap.getOrDefault(f.id(), 0.0)))
                    .collect(Collectors.toList());

        } catch (RestClientResponseException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED || e.getStatusCode() == HttpStatus.FORBIDDEN) {
                log.error("VA Facilities API rejected the configured API key: {}", e.getStatusCode());
                throw new VaFacilitiesConfigurationException(
                        "VA Facilities API key is missing or invalid. Set VA_API_KEY and restart the backend.");
            }

            log.error("VA Facilities API error: {}", e.getMessage());
            throw new VaFacilitiesServiceUnavailableException(
                    "VA Facilities API is unavailable; please try again later.");
        } catch (RestClientException e) {
            log.error("VA Facilities API error: {}", e.getMessage());
            throw new VaFacilitiesServiceUnavailableException(
                    "VA Facilities API is unavailable; please try again later.");
        }
    }

    private void validateApiKey() {
        if (apiKey == null
                || apiKey.isBlank()
                || "your-va-api-key-here".equals(apiKey)
                || "your_va_api_key_here".equals(apiKey)) {
            throw new VaFacilitiesConfigurationException(
                    "VA Facilities API key is missing or invalid. Set VA_API_KEY and restart the backend.");
        }
    }

    public static class VaFacilitiesConfigurationException extends RuntimeException {
        public VaFacilitiesConfigurationException(String message) {
            super(message);
        }
    }

    public static class VaFacilitiesServiceUnavailableException extends RuntimeException {
        public VaFacilitiesServiceUnavailableException(String message) {
            super(message);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VaApiResponse(
            @JsonProperty("data") List<VaFacility> data,
            @JsonProperty("meta") VaMeta meta
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VaMeta(
            @JsonProperty("distances") List<VaDistance> distances
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VaDistance(
            @JsonProperty("id") String id,
            @JsonProperty("distance") Double distance
    ) {}

    /**
     * Represents a single VA facility from the API response.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VaFacility(
            @JsonProperty("id") String id,
            @JsonProperty("attributes") VaFacilityAttributes attributes,
            Double distanceMiles
    ) {
        @com.fasterxml.jackson.annotation.JsonCreator
        public static VaFacility create(
                @JsonProperty("id") String id,
                @JsonProperty("attributes") VaFacilityAttributes attributes) {
            return new VaFacility(id, attributes, null);
        }

        public VaFacility withDistance(Double distance) {
            return new VaFacility(this.id, this.attributes, distance);
        }

        public String name() {
            return attributes != null ? attributes.name() : null;
        }

        public String facilityType() {
            return attributes != null ? attributes.facilityType() : null;
        }

        public String phone() {
            if (attributes == null || attributes.phone() == null) return null;
            return attributes.phone().main();
        }

        public String website() {
            return attributes != null ? attributes.website() : null;
        }

        public String address1() {
            if (attributes == null || attributes.address() == null) return null;
            VaPhysicalAddress physical = attributes.address().physical();
            return physical != null ? physical.address1() : null;
        }

        public String city() {
            if (attributes == null || attributes.address() == null) return null;
            VaPhysicalAddress physical = attributes.address().physical();
            return physical != null ? physical.city() : null;
        }

        public String state() {
            if (attributes == null || attributes.address() == null) return null;
            VaPhysicalAddress physical = attributes.address().physical();
            return physical != null ? physical.state() : null;
        }

        public String zipCode() {
            if (attributes == null || attributes.address() == null) return null;
            VaPhysicalAddress physical = attributes.address().physical();
            if (physical == null || physical.zip() == null) return null;
            return physical.zip().length() > 5 ? physical.zip().substring(0, 5) : physical.zip();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VaFacilityAttributes(
            @JsonProperty("name") String name,
            @JsonProperty("facility_type")
            @JsonAlias("facilityType")
            String facilityType,
            @JsonProperty("classification") String classification,
            @JsonProperty("address") VaAddress address,
            @JsonProperty("phone") VaPhone phone,
            @JsonProperty("website") String website
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VaAddress(
            @JsonProperty("physical") VaPhysicalAddress physical
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VaPhysicalAddress(
            @JsonProperty("address_1")
            @JsonAlias("address1")
            String address1,
            @JsonProperty("city") String city,
            @JsonProperty("state") String state,
            @JsonProperty("zip") String zip
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VaPhone(
            @JsonProperty("main") String main
    ) {}
}
