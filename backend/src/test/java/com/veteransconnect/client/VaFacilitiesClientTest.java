package com.veteransconnect.client;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@DisplayName("VA Facilities Client Tests")
class VaFacilitiesClientTest {

    @Test
    @DisplayName("Should attach distances and skip unusable facility records")
    void shouldAttachDistancesAndSkipUnusableFacilityRecords() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.va.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        VaFacilitiesClient client = new VaFacilitiesClient(builder.build(), "test-api-key");

        server.expect(once(), requestTo(
                        "https://api.va.test/services/va_facilities/v1/facilities?lat=40.75&long=-73.99&radius=50&type=health&per_page=20"))
                .andExpect(header("apikey", "test-api-key"))
                .andRespond(withSuccess("""
                        {
                          "data": [
                            {
                              "id": "vha_689",
                              "attributes": {
                                "name": "VA New York Healthcare",
                                "facility_type": "va_health_facility",
                                "classification": "VA Medical Center",
                                "address": {
                                  "physical": {
                                    "address_1": "423 East 23rd Street",
                                    "city": "New York",
                                    "state": "NY",
                                    "zip": "10010-5050"
                                  }
                                },
                                "phone": { "main": "212-686-7500" },
                                "website": "https://va.gov/ny"
                              }
                            },
                            {
                              "attributes": { "name": "Missing id should be skipped" }
                            }
                          ],
                          "meta": {
                            "distances": [
                              { "id": "vha_689", "distance": 2.5 },
                              { "id": "vha_689", "distance": 99.9 }
                            ]
                          }
                        }
                        """, MediaType.APPLICATION_JSON));

        List<VaFacilitiesClient.VaFacility> facilities =
                client.searchFacilities(40.75, -73.99, "health", 50);

        assertThat(facilities).hasSize(1);
        assertThat(facilities.get(0).id()).isEqualTo("vha_689");
        assertThat(facilities.get(0).distanceMiles()).isEqualTo(2.5);
        assertThat(facilities.get(0).zipCode()).isEqualTo("10010");
        server.verify();
    }

    @Test
    @DisplayName("Should reject unsupported VA facility types")
    void shouldRejectUnsupportedFacilityTypes() {
        VaFacilitiesClient client = new VaFacilitiesClient(
                RestClient.builder().baseUrl("https://api.va.test").build(),
                "test-api-key"
        );

        assertThatThrownBy(() -> client.searchFacilities(40.75, -73.99, "cemetery", 50))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported VA facility type");
    }
}
