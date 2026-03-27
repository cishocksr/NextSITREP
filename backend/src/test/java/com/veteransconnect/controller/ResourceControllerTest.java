package com.veteransconnect.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.veteransconnect.dto.ResourceSearchResult;
import com.veteransconnect.dto.SaveResourceRequest;
import com.veteransconnect.dto.SavedResourceResponse;
import com.veteransconnect.dto.UpdateNotesRequest;
import com.veteransconnect.exception.ResourceAlreadySavedException;
import com.veteransconnect.exception.SavedResourceNotFoundException;
import com.veteransconnect.model.enums.ResourceCategory;
import com.veteransconnect.service.ResourceSearchService;
import com.veteransconnect.service.SavedResourceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for ResourceController.
 *
 * @WithMockUser simulates an authenticated veteran with email "veteran@example.com".
 * The SecurityAutoConfiguration is excluded so we don't need a real JWT filter.
 */
@WebMvcTest(
        controllers = ResourceController.class,
        excludeAutoConfiguration = SecurityAutoConfiguration.class
)
@DisplayName("Resource Controller Tests")
class ResourceControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private ResourceSearchService resourceSearchService;
    @MockitoBean private SavedResourceService savedResourceService;

    private UUID savedId;
    private ResourceSearchResult searchResult;
    private SavedResourceResponse savedResponse;
    private SaveResourceRequest saveRequest;

    @BeforeEach
    void setUp() {
        savedId = UUID.randomUUID();

        searchResult = new ResourceSearchResult(
                "vha_689", "VA_FACILITIES",
                "VA New York Healthcare", "VA Medical Center",
                ResourceCategory.HEALTHCARE,
                "212-686-7500", "https://va.gov/ny",
                "423 East 23rd Street", "New York", "NY", "10010",
                2.5, false
        );

        savedResponse = new SavedResourceResponse(
                savedId, "vha_689", "VA_FACILITIES",
                "VA New York Healthcare", "VA Medical Center",
                ResourceCategory.HEALTHCARE,
                "212-686-7500", "https://va.gov/ny",
                "423 East 23rd Street", "New York", "NY", "10010",
                null,
                LocalDateTime.now(), LocalDateTime.now()
        );

        saveRequest = new SaveResourceRequest(
                "vha_689", "VA_FACILITIES",
                "VA New York Healthcare", "VA Medical Center",
                ResourceCategory.HEALTHCARE,
                "212-686-7500", "https://va.gov/ny",
                "423 East 23rd Street", "New York", "NY", "10010",
                null
        );
    }

    // =========================================================
    // GET /api/v1/resources/search
    // =========================================================

    @Nested
    @DisplayName("GET /api/v1/resources/search")
    class SearchResources {

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should return 200 OK with search results")
        void shouldReturn200WithResults() throws Exception {
            when(resourceSearchService.search(eq("10001"), isNull(), isNull(), isNull(), eq("veteran@example.com")))
                    .thenReturn(List.of(searchResult));

            mockMvc.perform(get("/api/v1/resources/search")
                            .param("zipCode", "10001"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].externalId").value("vha_689"))
                    .andExpect(jsonPath("$[0].name").value("VA New York Healthcare"))
                    .andExpect(jsonPath("$[0].category").value("HEALTHCARE"))
                    .andExpect(jsonPath("$[0].isSaved").value(false));
        }

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should pass category and keyword filters to service")
        void shouldPassFiltersToService() throws Exception {
            when(resourceSearchService.search(eq("10001"), eq(ResourceCategory.HEALTHCARE),
                    eq("mental"), isNull(), eq("veteran@example.com")))
                    .thenReturn(List.of(searchResult));

            mockMvc.perform(get("/api/v1/resources/search")
                            .param("zipCode", "10001")
                            .param("category", "HEALTHCARE")
                            .param("keyword", "mental"))
                    .andExpect(status().isOk());

            verify(resourceSearchService).search("10001", ResourceCategory.HEALTHCARE, "mental", null, "veteran@example.com");
        }

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should return empty list when no results found")
        void shouldReturn200WithEmptyList() throws Exception {
            when(resourceSearchService.search(anyString(), any(), any(), any(), anyString()))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/v1/resources/search").param("zipCode", "99999"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isEmpty());
        }
    }

    // =========================================================
    // GET /api/v1/resources/saved
    // =========================================================

    @Nested
    @DisplayName("GET /api/v1/resources/saved")
    class GetSavedResources {

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should return 200 OK with saved resources list")
        void shouldReturn200WithSavedList() throws Exception {
            when(savedResourceService.getSavedResources("veteran@example.com"))
                    .thenReturn(List.of(savedResponse));

            mockMvc.perform(get("/api/v1/resources/saved"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].externalId").value("vha_689"))
                    .andExpect(jsonPath("$[0].name").value("VA New York Healthcare"));
        }
    }

    // =========================================================
    // POST /api/v1/resources/saved
    // =========================================================

    @Nested
    @DisplayName("POST /api/v1/resources/saved")
    class SaveResource {

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should return 201 Created when resource is saved successfully")
        void shouldReturn201OnSuccess() throws Exception {
            when(savedResourceService.saveResource(eq("veteran@example.com"), any(SaveResourceRequest.class)))
                    .thenReturn(savedResponse);

            mockMvc.perform(post("/api/v1/resources/saved")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(saveRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(savedId.toString()))
                    .andExpect(jsonPath("$.externalId").value("vha_689"));
        }

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should return 409 Conflict when resource already saved")
        void shouldReturn409WhenAlreadySaved() throws Exception {
            when(savedResourceService.saveResource(anyString(), any(SaveResourceRequest.class)))
                    .thenThrow(new ResourceAlreadySavedException("Already saved: VA New York Healthcare"));

            mockMvc.perform(post("/api/v1/resources/saved")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(saveRequest)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message").value("Already saved: VA New York Healthcare"));
        }
    }

    // =========================================================
    // PATCH /api/v1/resources/saved/{id}/notes
    // =========================================================

    @Nested
    @DisplayName("PATCH /api/v1/resources/saved/{id}/notes")
    class UpdateNotes {

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should return 200 OK with updated notes")
        void shouldReturn200OnSuccess() throws Exception {
            SavedResourceResponse withNotes = new SavedResourceResponse(
                    savedId, "vha_689", "VA_FACILITIES",
                    "VA New York Healthcare", "VA Medical Center",
                    ResourceCategory.HEALTHCARE,
                    "212-686-7500", "https://va.gov/ny",
                    "423 East 23rd Street", "New York", "NY", "10010",
                    "- Great mental health program\n- Need DD-214",
                    LocalDateTime.now(), LocalDateTime.now()
            );

            when(savedResourceService.updateNotes(eq("veteran@example.com"), eq(savedId), anyString()))
                    .thenReturn(withNotes);

            UpdateNotesRequest notesRequest = new UpdateNotesRequest("- Great mental health program\n- Need DD-214");

            mockMvc.perform(patch("/api/v1/resources/saved/{id}/notes", savedId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(notesRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.notes").value("- Great mental health program\n- Need DD-214"));
        }

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should return 404 when saved resource not found")
        void shouldReturn404WhenNotFound() throws Exception {
            when(savedResourceService.updateNotes(anyString(), any(UUID.class), anyString()))
                    .thenThrow(new SavedResourceNotFoundException("Saved resource not found: " + savedId));

            UpdateNotesRequest notesRequest = new UpdateNotesRequest("some notes");

            mockMvc.perform(patch("/api/v1/resources/saved/{id}/notes", savedId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(notesRequest)))
                    .andExpect(status().isNotFound());
        }
    }

    // =========================================================
    // DELETE /api/v1/resources/saved/{id}
    // =========================================================

    @Nested
    @DisplayName("DELETE /api/v1/resources/saved/{id}")
    class UnsaveResource {

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should return 204 No Content on successful unsave")
        void shouldReturn204OnSuccess() throws Exception {
            doNothing().when(savedResourceService).unsaveResource("veteran@example.com", savedId);

            mockMvc.perform(delete("/api/v1/resources/saved/{id}", savedId))
                    .andExpect(status().isNoContent());

            verify(savedResourceService).unsaveResource("veteran@example.com", savedId);
        }

        @Test
        @WithMockUser(username = "veteran@example.com")
        @DisplayName("Should return 404 when saved resource not found")
        void shouldReturn404WhenNotFound() throws Exception {
            doThrow(new SavedResourceNotFoundException("Saved resource not found: " + savedId))
                    .when(savedResourceService).unsaveResource(anyString(), any(UUID.class));

            mockMvc.perform(delete("/api/v1/resources/saved/{id}", savedId))
                    .andExpect(status().isNotFound());
        }
    }
}
