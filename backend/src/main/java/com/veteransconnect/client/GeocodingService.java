package com.veteransconnect.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

/**
 * Converts a US zip code into geographic coordinates (latitude/longitude)
 * using the OpenStreetMap Nominatim geocoding API.
 *
 * Why Nominatim?
 *   - Completely free with no API key required
 *   - Based on OpenStreetMap data — excellent US coverage
 *   - Simple REST API
 *
 * Rate limit: Nominatim requires no more than 1 request/second and a
 * descriptive User-Agent header identifying your application (their ToS).
 * For production you'd add a caching layer so the same zip isn't geocoded
 * on every search. That's covered in the future improvements phase.
 *
 * Nominatim docs: https://nominatim.org/release-docs/develop/api/Search/
 */
@Service
@Slf4j
public class GeocodingService {

    private final RestClient restClient;

    // Injected from application.properties — identifies our app to Nominatim
    @Value("${geocoding.nominatim.user-agent}")
    private String userAgent;

    public GeocodingService(
            @Value("${geocoding.nominatim.base-url}") String baseUrl) {
        // Build a RestClient pointed at Nominatim
        // RestClient is Spring 6.1+'s modern synchronous HTTP client — no extra dependency needed
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    /**
     * A simple record to hold the lat/long pair we need.
     * Java records are perfect for small value objects like this.
     */
    public record Coordinates(double latitude, double longitude) {}

    /**
     * Look up the latitude and longitude for a US zip code.
     *
     * @param zipCode a 5-digit US zip code
     * @return Coordinates with latitude and longitude
     * @throws GeocodingException if the zip code cannot be found
     */
    public Coordinates getCoordinatesForZipCode(String zipCode) {
        log.debug("Geocoding zip code: {}", zipCode);

        try {
            // Nominatim returns a JSON array of results — we take the first one.
            // The API params:
            //   postalcode = the zip code to look up
            //   country    = "us" restricts to United States
            //   format     = "json" for JSON response
            //   limit      = 1 because we only need the best match
            List<NominatimResult> results = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("postalcode", zipCode)
                            .queryParam("country", "us")
                            .queryParam("format", "json")
                            .queryParam("limit", "1")
                            .build())
                    // Nominatim's ToS requires a User-Agent identifying your application
                    .header("User-Agent", userAgent)
                    // Tell Spring how to deserialize the JSON array into our record list
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<>() {});

            if (results == null || results.isEmpty()) {
                throw new GeocodingException("Could not find coordinates for zip code: " + zipCode);
            }

            NominatimResult result = results.get(0);
            double lat = Double.parseDouble(result.lat());
            double lon = Double.parseDouble(result.lon());

            log.debug("Zip {} resolved to lat={}, lon={}", zipCode, lat, lon);
            return new Coordinates(lat, lon);

        } catch (RestClientException e) {
            log.error("Geocoding API error for zip code {}: {}", zipCode, e.getMessage());
            throw new GeocodingException("Geocoding service unavailable — please try again later");
        }
    }

    // ── Nominatim API response DTO ─────────────────────────────────────────────
    // Nominatim returns latitude and longitude as strings in the JSON.
    // We use @com.fasterxml.jackson.annotation.JsonProperty to map the "lon" field
    // (Nominatim uses "lon" not "lng").
    private record NominatimResult(
            @com.fasterxml.jackson.annotation.JsonProperty("lat") String lat,
            @com.fasterxml.jackson.annotation.JsonProperty("lon") String lon
    ) {}

    // ── Custom exception ───────────────────────────────────────────────────────
    public static class GeocodingException extends RuntimeException {
        public GeocodingException(String message) {
            super(message);
        }
    }
}
