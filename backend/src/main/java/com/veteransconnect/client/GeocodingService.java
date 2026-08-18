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

    public record Coordinates(double latitude, double longitude) {}

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
            List<NominatimResult> results = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("postalcode", normalizedZipCode)
                            .queryParam("country", "us")
                            .queryParam("format", "json")
                            .queryParam("limit", "1")
                            .build())
                    .header("User-Agent", userAgent)
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

    private record NominatimResult(
            @com.fasterxml.jackson.annotation.JsonProperty("lat") String lat,
            @com.fasterxml.jackson.annotation.JsonProperty("lon") String lon
    ) {}

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
