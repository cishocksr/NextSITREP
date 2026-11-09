package com.veteransconnect.service;

import com.veteransconnect.exception.SavedResourceNotFoundException;
import com.veteransconnect.model.SavedResource;
import com.veteransconnect.model.User;
import com.veteransconnect.repository.SavedResourceRepository;
import com.veteransconnect.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.atomic.AtomicBoolean;

import static com.veteransconnect.support.SavedResourceFixtures.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DataJpaTest
@Import(SavedResourceServiceImpl.class)
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class SavedResourceServicePersistenceTest {
    @Autowired SavedResourceService service;
    @Autowired UserRepository users;
    @MockitoSpyBean SavedResourceRepository resources;
    @Autowired PlatformTransactionManager transactions;
    @Autowired JdbcTemplate jdbc;
    User alice;
    User bob;

    @BeforeEach
    void accounts() {
        alice = users.saveAndFlush(user("alice@example.test"));
        bob = users.saveAndFlush(user("bob@example.test"));
    }

    @AfterEach
    void cleanupCommittedFixtures() {
        resources.deleteAllInBatch();
        users.deleteAllInBatch();
    }

    @Test
    void serviceCommitsSaveUpdateAndDeleteAcrossIndependentTransactions() {
        var saved = service.saveResource(alice.getEmail(), request("fixture-1", "synthetic"));
        assertThat(resources.findByUser(alice)).extracting("id").containsExactly(saved.id());
        service.updateNotes(alice.getEmail(), saved.id(), "committed edit");
        assertThat(resources.findById(saved.id()).orElseThrow().getNotes()).isEqualTo("committed edit");
        service.unsaveResource(alice.getEmail(), saved.id());
        assertThat(resources.existsById(saved.id())).isFalse();
        assertThat(users.existsById(alice.getId())).isTrue();
    }

    @Test
    void savedResponseMatchesCommittedRow() {
        var response = service.saveResource(alice.getEmail(), request("fixture-1", "synthetic"));
        assertThat(service.getSavedResources(alice.getEmail())).containsExactly(response);
    }

    @Test
    void updatedResponseMatchesCommittedRow() {
        var saved = resources.saveAndFlush(resource(alice, "fixture-1", "synthetic"));
        jdbc.update("UPDATE saved_resources SET updated_at = ? WHERE id = ?",
                java.time.LocalDateTime.of(2026, 1, 1, 0, 0), saved.getId());
        var response = service.updateNotes(alice.getEmail(), saved.getId(), "edited");
        assertThat(service.getSavedResources(alice.getEmail())).containsExactly(response);
    }

    @Test
    void twoUserIsolationAndDeniedMutationsLeaveCommittedDataIntact() {
        var a = service.saveResource(alice.getEmail(), request("same-id", "synthetic"));
        var b = service.saveResource(bob.getEmail(), request("same-id", "synthetic"));
        assertThat(service.getSavedResources(bob.getEmail())).extracting("id").containsExactly(b.id());
        assertThatThrownBy(() -> service.updateNotes(bob.getEmail(), a.id(), "attack"))
                .isInstanceOf(SavedResourceNotFoundException.class);
        assertThatThrownBy(() -> service.unsaveResource(bob.getEmail(), a.id()))
                .isInstanceOf(SavedResourceNotFoundException.class);
        assertThat(resources.findById(a.id()).orElseThrow().getNotes()).isEqualTo("Original notes");
        assertThat(resources.count()).isEqualTo(2);
    }

    @Test
    void joinsAnOuterTransactionAndRollsBackItsInsert() {
        var tx = new TransactionTemplate(transactions);
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
            service.saveResource(alice.getEmail(), request("rolled-back", "synthetic"));
            throw new IllegalStateException("Synthetic caller failure");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(resources.existsByUserAndExternalIdAndSourceApi(alice, "rolled-back", "synthetic")).isFalse();
    }

    @Test
    void repositoryFailureRollsBackDirtyManagedNotes() {
        var saved = service.saveResource(alice.getEmail(), request("fixture-1", "synthetic"));
        var active = new AtomicBoolean();
        doAnswer(invocation -> {
            active.set(TransactionSynchronizationManager.isActualTransactionActive()
                    && !TransactionSynchronizationManager.isCurrentTransactionReadOnly());
            throw new DataAccessResourceFailureException("Synthetic write failure after notes mutation");
        }).when(resources).saveAndFlush(any(SavedResource.class));
        assertThatThrownBy(() -> service.updateNotes(alice.getEmail(), saved.id(), "must roll back"))
                .isInstanceOf(DataAccessResourceFailureException.class);
        assertThat(active).isTrue();
        assertThat(resources.findById(saved.id()).orElseThrow().getNotes()).isEqualTo("Original notes");
    }

    @Test
    void listingRunsInItsOwnReadOnlyTransaction() {
        var activeReadOnly = new AtomicBoolean();
        doAnswer(invocation -> {
            activeReadOnly.set(TransactionSynchronizationManager.isActualTransactionActive()
                    && TransactionSynchronizationManager.isCurrentTransactionReadOnly());
            return java.util.List.of();
        }).when(resources).findByUserOrderBySavedAtDesc(any(User.class));
        assertThat(service.getSavedResources(alice.getEmail())).isEmpty();
        assertThat(activeReadOnly).isTrue();
    }
}
