package com.veteransconnect.service;

import com.veteransconnect.dto.SavedResourceResponse;
import com.veteransconnect.exception.ResourceAlreadySavedException;
import com.veteransconnect.exception.SavedResourceNotFoundException;
import com.veteransconnect.exception.UserNotFoundException;
import com.veteransconnect.model.SavedResource;
import com.veteransconnect.model.User;
import com.veteransconnect.repository.SavedResourceRepository;
import com.veteransconnect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.veteransconnect.support.SavedResourceFixtures.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SavedResourceServiceTest {
    @Mock SavedResourceRepository repository;
    @Mock UserRepository users;
    @InjectMocks SavedResourceServiceImpl service;
    User owner;
    SavedResource saved;

    @BeforeEach
    void fixtures() {
        owner = user("alice@example.test");
        owner.setId(UUID.randomUUID());
        saved = resource(owner, "fixture-1", "synthetic");
        saved.setId(UUID.randomUUID());
        saved.setSavedAt(LocalDateTime.of(2026, 1, 1, 12, 0));
        saved.setUpdatedAt(saved.getSavedAt());
    }

    void knownUser() { when(users.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner)); }
    void ownedRecord() {
        knownUser();
        when(repository.findById(saved.getId())).thenReturn(Optional.of(saved));
    }

    @Test
    void saveAssociatesPrincipalAndMapsEverySubmittedField() {
        knownUser();
        when(repository.saveAndFlush(any(SavedResource.class))).thenReturn(saved);
        var response = service.saveResource(owner.getEmail(), request("fixture-1", "synthetic"));
        var capture = ArgumentCaptor.forClass(SavedResource.class);
        verify(repository).saveAndFlush(capture.capture());
        assertThat(capture.getValue().getUser()).isSameAs(owner);
        assertThat(capture.getValue()).usingRecursiveComparison()
                .ignoringFields("id", "savedAt", "updatedAt").isEqualTo(saved);
        assertThat(response).isEqualTo(SavedResourceResponse.from(saved));
        verify(repository).existsByUserAndExternalIdAndSourceApi(owner, "fixture-1", "synthetic");
    }

    @Test
    void duplicateIsRejectedBeforeWriting() {
        knownUser();
        when(repository.existsByUserAndExternalIdAndSourceApi(owner, "fixture-1", "synthetic")).thenReturn(true);
        assertThatThrownBy(() -> service.saveResource(owner.getEmail(), request("fixture-1", "synthetic")))
                .isInstanceOf(ResourceAlreadySavedException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void listingUsesOnlyTheResolvedOwnerAndKeepsRepositoryOrder() {
        knownUser();
        var second = resource(owner, "fixture-2", "synthetic");
        when(repository.findByUserOrderBySavedAtDesc(owner)).thenReturn(List.of(saved, second));
        assertThat(service.getSavedResources(owner.getEmail()))
                .containsExactly(SavedResourceResponse.from(saved), SavedResourceResponse.from(second));
        verify(repository, never()).findAll();
    }

    @Test
    void noSavedResourcesIsAnEmptyList() {
        knownUser();
        when(repository.findByUserOrderBySavedAtDesc(owner)).thenReturn(List.of());
        assertThat(service.getSavedResources(owner.getEmail())).isEmpty();
    }

    @Test
    void ownerCanDeleteOnlyTheLoadedRecord() {
        ownedRecord();
        service.unsaveResource(owner.getEmail(), saved.getId());
        verify(repository).delete(saved);
    }

    @Test
    void notesRetainNonblankWhitespaceAndOtherFields() {
        ownedRecord();
        when(repository.saveAndFlush(saved)).thenReturn(saved);
        var response = service.updateNotes(owner.getEmail(), saved.getId(), "  edited notes  ");
        assertThat(response.notes()).isEqualTo("  edited notes  ");
        assertThat(response.externalId()).isEqualTo("fixture-1");
        assertThat(response.id()).isEqualTo(saved.getId());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n"})
    void nullAndBlankNotesAreCleared(String notes) {
        ownedRecord();
        when(repository.saveAndFlush(saved)).thenReturn(saved);
        assertThat(service.updateNotes(owner.getEmail(), saved.getId(), notes).notes()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"save", "list", "update", "delete"})
    void nonexistentAccountNeverTouchesSavedRecords(String operation) {
        when(users.findByEmail(owner.getEmail())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> invoke(operation)).isInstanceOf(UserNotFoundException.class);
        verifyNoInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"update", "delete"})
    void missingAndForeignOwnedRecordsHaveTheSameNotFoundContract(String operation) {
        knownUser();
        when(repository.findById(saved.getId())).thenReturn(Optional.empty());
        var missing = catchThrowable(() -> invoke(operation));
        var other = user("bob@example.test");
        other.setId(UUID.randomUUID());
        saved.setUser(other);
        when(repository.findById(saved.getId())).thenReturn(Optional.of(saved));
        var forbidden = catchThrowable(() -> invoke(operation));
        assertThat(missing).isInstanceOf(SavedResourceNotFoundException.class);
        assertThat(forbidden).isInstanceOf(SavedResourceNotFoundException.class).hasMessage(missing.getMessage());
        assertThat(saved.getNotes()).isEqualTo("Original notes");
        verify(repository, never()).saveAndFlush(any());
        verify(repository, never()).delete(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"save", "list", "update", "delete"})
    void repositoryFailuresPropagateRatherThanReportingSuccess(String operation) {
        knownUser();
        var failure = new DataAccessResourceFailureException("Synthetic repository outage");
        switch (operation) {
            case "save" -> when(repository.saveAndFlush(any(SavedResource.class))).thenThrow(failure);
            case "list" -> when(repository.findByUserOrderBySavedAtDesc(owner)).thenThrow(failure);
            case "update" -> {
                when(repository.findById(saved.getId())).thenReturn(Optional.of(saved));
                when(repository.saveAndFlush(saved)).thenThrow(failure);
            }
            case "delete" -> {
                when(repository.findById(saved.getId())).thenReturn(Optional.of(saved));
                doThrow(failure).when(repository).delete(saved);
            }
        }
        assertThatThrownBy(() -> invoke(operation)).isSameAs(failure);
    }

    @Test
    void duplicateLookupOutageDoesNotAttemptInsert() {
        knownUser();
        when(repository.existsByUserAndExternalIdAndSourceApi(owner, "fixture-1", "synthetic"))
                .thenThrow(new DataAccessResourceFailureException("Synthetic lookup outage"));
        assertThatThrownBy(() -> invoke("save")).isInstanceOf(DataAccessResourceFailureException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    private void invoke(String operation) {
        switch (operation) {
            case "save" -> service.saveResource(owner.getEmail(), request("fixture-1", "synthetic"));
            case "list" -> service.getSavedResources(owner.getEmail());
            case "update" -> service.updateNotes(owner.getEmail(), saved.getId(), "new notes");
            case "delete" -> service.unsaveResource(owner.getEmail(), saved.getId());
            default -> throw new IllegalArgumentException(operation);
        }
    }
}
