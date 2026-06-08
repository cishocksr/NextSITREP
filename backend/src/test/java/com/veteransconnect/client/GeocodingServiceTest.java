package com.veteransconnect.client;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@DisplayName("Geocoding Service Tests")
class GeocodingServiceTest {

    @Test
    @DisplayName("Should normalize zip code and cache successful coordinate lookup")
    void shouldNormalizeZipCodeAndCacheSuccessfulLookup() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://nominatim.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeocodingService service = new GeocodingService(
                builder.build(),
                "VeteransConnect-Test",
                true
        );

        server.expect(once(), requestTo("https://nominatim.test/search?postalcode=10001&country=us&format=json&limit=1"))
                .andExpect(header("User-Agent", "VeteransConnect-Test"))
                .andRespond(withSuccess("""
                        [{"lat":"40.7506","lon":"-73.9972"}]
                        """, org.springframework.http.MediaType.APPLICATION_JSON));

        GeocodingService.Coordinates first = service.getCoordinatesForZipCode(" 10001 ");
        GeocodingService.Coordinates second = service.getCoordinatesForZipCode("10001");

        assertThat(first.latitude()).isEqualTo(40.7506);
        assertThat(first.longitude()).isEqualTo(-73.9972);
        assertThat(second).isEqualTo(first);
        server.verify();
    }

    @Test
    @DisplayName("Should reject malformed zip code before calling upstream")
    void shouldRejectMalformedZipCode() {
        GeocodingService service = new GeocodingService(
                RestClient.builder().baseUrl("https://nominatim.test").build(),
                "VeteransConnect-Test",
                true
        );

        assertThatThrownBy(() -> service.getCoordinatesForZipCode("1001A"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5-digit");
    }

    @Test
    @DisplayName("Should treat invalid upstream coordinates as service unavailable")
    void shouldTreatInvalidUpstreamCoordinatesAsUnavailable() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://nominatim.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeocodingService service = new GeocodingService(
                builder.build(),
                "VeteransConnect-Test",
                false
        );

        server.expect(once(), requestTo("https://nominatim.test/search?postalcode=10001&country=us&format=json&limit=1"))
                .andRespond(withSuccess("""
                        [{"lat":"not-a-number","lon":"-73.9972"}]
                        """, org.springframework.http.MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> service.getCoordinatesForZipCode("10001"))
                .isInstanceOf(GeocodingService.GeocodingServiceUnavailableException.class)
                .hasMessageContaining("unavailable");
        server.verify();
    }
}
