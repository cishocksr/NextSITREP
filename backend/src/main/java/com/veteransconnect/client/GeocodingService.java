package com.veteransconnect.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

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

    private static final Pattern ZIP_CODE_PATTERN = Pattern.compile("\\d{5}");

    private final RestClient restClient;
    private final String userAgent;
    private final boolean cacheEnabled;
    private final Map<String, Coordinates> coordinatesCache = new ConcurrentHashMap<>();

    @Autowired
    public GeocodingService(
            RestClient.Builder restClientBuilder,
            @Value("${geocoding.nominatim.base-url}") String baseUrl,
            @Value("${geocoding.nominatim.user-agent}") String userAgent,
            @Value("${geocoding.nominatim.connect-timeout-ms:2000}") int connectTimeoutMs,
            @Value("${geocoding.nominatim.read-timeout-ms:3000}") int readTimeoutMs,
            @Value("${geocoding.nominatim.cache-enabled:true}") boolean cacheEnabled) {
        this(
                restClientBuilder
                        .requestFactory(requestFactory(connectTimeoutMs, readTimeoutMs))
                        .baseUrl(baseUrl)
                        .build(),
                userAgent,
                cacheEnabled
        );
    }

    GeocodingService(RestClient restClient, String userAgent, boolean cacheEnabled) {
        this.restClient = restClient;
        this.userAgent = userAgent;
        this.cacheEnabled = cacheEnabled;
    }

    private static SimpleClientHttpRequestFactory requestFactory(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        return factory;
    }

    public static String normalizeZipCode(String zipCode) {
        if (zipCode == null) {
            throw new IllegalArgumentException("Zip code is required");
        }

        String normalized = zipCode.trim();
        if (!ZIP_CODE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Zip code must be a 5-digit US zip code");
        }

        return normalized;
    }

    public static boolean isValidZipCode(String zipCode) {
        return zipCode != null && ZIP_CODE_PATTERN.matcher(zipCode.trim()).matches();
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
        String normalizedZipCode = normalizeZipCode(zipCode);
        log.debug("Geocoding zip code: {}", normalizedZipCode);

        if (cacheEnabled) {
            Coordinates cached = coordinatesCache.get(normalizedZipCode);
            if (cached != null) {
                log.debug("Using cached coordinates for zip code: {}", normalizedZipCode);
                return cached;
            }
        }

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
                            .queryParam("postalcode", normalizedZipCode)
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
                throw new GeocodingException("Could not find coordinates for zip code: " + normalizedZipCode);
            }

            NominatimResult result = results.get(0);
            Coordinates coordinates = parseCoordinates(result, normalizedZipCode);

            if (cacheEnabled) {
                coordinatesCache.put(normalizedZipCode, coordinates);
            }

            log.debug("Zip {} resolved to lat={}, lon={}",
                    normalizedZipCode, coordinates.latitude(), coordinates.longitude());
            return coordinates;

        } catch (RestClientException e) {
            log.error("Geocoding API error for zip code {}: {}", normalizedZipCode, e.getMessage());
            throw new GeocodingServiceUnavailableException(
                    "Geocoding service unavailable; please try again later");
        }
    }

    private Coordinates parseCoordinates(NominatimResult result, String zipCode) {
        if (result == null || result.lat() == null || result.lon() == null) {
            throw new GeocodingException("Could not find coordinates for zip code: " + zipCode);
        }

        try {
            return new Coordinates(Double.parseDouble(result.lat()), Double.parseDouble(result.lon()));
        } catch (NumberFormatException e) {
            log.warn("Geocoding API returned invalid coordinates for zip code {}", zipCode);
            throw new GeocodingServiceUnavailableException(
                    "Geocoding service unavailable; please try again later");
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

    public static class GeocodingServiceUnavailableException extends RuntimeException {
        public GeocodingServiceUnavailableException(String message) {
            super(message);
        }
    }
}
