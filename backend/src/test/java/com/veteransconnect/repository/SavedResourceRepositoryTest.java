package com.veteransconnect.repository;

import com.veteransconnect.dto.SavedResourceResponse;
import com.veteransconnect.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.UUID;

import static com.veteransconnect.support.SavedResourceFixtures.*;
import static org.assertj.core.api.Assertions.*;

/** Migrated H2 schema, not a substitute for T11 PostgreSQL verification. */
@DataJpaTest
@ActiveProfiles("test")
class SavedResourceRepositoryTest {
    @Autowired SavedResourceRepository resources;
    @Autowired UserRepository users;
    @Autowired TestEntityManager entityManager;
    @Autowired JdbcTemplate jdbc;
    User alice;
    User bob;

    @BeforeEach
    void accounts() {
        alice = users.saveAndFlush(user("alice@example.test"));
        bob = users.saveAndFlush(user("bob@example.test"));
    }

    @Test
    void reloadsAllSnapshotFieldsOwnerAndGeneratedTimestamps() {
        var stored = resources.saveAndFlush(resource(alice, "fixture-1", "synthetic"));
        var expected = SavedResourceResponse.from(stored);
        var id = stored.getId();
        entityManager.clear();
        var reloaded = resources.findById(id).orElseThrow();
        assertThat(SavedResourceResponse.from(reloaded)).isEqualTo(expected);
        assertThat(reloaded.getUser().getId()).isEqualTo(alice.getId());
        assertThat(reloaded.getSavedAt()).isNotNull();
        assertThat(reloaded.getUpdatedAt()).isNotNull();
    }

    @Test
    void ownerQueriesExcludeOtherUsersAndSortNewestFirst() {
        var older = resources.saveAndFlush(resource(alice, "older", "synthetic"));
        var newer = resources.saveAndFlush(resource(alice, "newer", "synthetic"));
        resources.saveAndFlush(resource(bob, "foreign", "synthetic"));
        // Deterministic history; do not depend on sleep/clock precision.
        jdbc.update("UPDATE saved_resources SET saved_at = ? WHERE id = ?", LocalDateTime.of(2026, 1, 1, 0, 0), older.getId());
        jdbc.update("UPDATE saved_resources SET saved_at = ? WHERE id = ?", LocalDateTime.of(2026, 1, 2, 0, 0), newer.getId());
        entityManager.clear();
        assertThat(resources.findByUserOrderBySavedAtDesc(alice)).extracting("externalId").containsExactly("newer", "older");
        assertThat(resources.findByUser(alice)).extracting("externalId").containsExactlyInAnyOrder("older", "newer");
        assertThat(resources.findByUser(bob)).extracting("externalId").containsExactly("foreign");
    }

    @Test
    void tupleQueriesIncludeOwnerAndSource() {
        var a = resources.saveAndFlush(resource(alice, "shared-id", "source-a"));
        resources.saveAndFlush(resource(alice, "shared-id", "source-b"));
        resources.saveAndFlush(resource(bob, "shared-id", "source-a"));
        assertThat(resources.findByUserAndExternalIdAndSourceApi(alice, "shared-id", "source-a")).get().extracting("id").isEqualTo(a.getId());
        assertThat(resources.existsByUserAndExternalIdAndSourceApi(alice, "shared-id", "source-b")).isTrue();
        assertThat(resources.existsByUserAndExternalIdAndSourceApi(bob, "shared-id", "source-b")).isFalse();
        assertThat(resources.findByUserAndExternalIdAndSourceApi(alice, "missing", "source-a")).isEmpty();
        assertThat(resources.count()).isEqualTo(3);
    }

    @Test
    void databaseRejectsDuplicateOwnerExternalIdSourceTuple() {
        resources.saveAndFlush(resource(alice, "duplicate", "synthetic"));
        assertThatThrownBy(() -> resources.saveAndFlush(resource(alice, "duplicate", "synthetic")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void foreignKeyRejectsAnUnknownOwnerEvenThroughDirectSql() {
        var stored = resources.saveAndFlush(resource(alice, "fixture-1", "synthetic"));
        assertThatThrownBy(() -> jdbc.update("UPDATE saved_resources SET user_id = ? WHERE id = ?", UUID.randomUUID(), stored.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRequiresAnOwner() {
        var stored = resources.saveAndFlush(resource(alice, "fixture-1", "synthetic"));
        assertThatThrownBy(() -> jdbc.update("UPDATE saved_resources SET user_id = NULL WHERE id = ?", stored.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingAResourceDoesNotCascadeToUserOrOtherSavedRows() {
        var removed = resources.saveAndFlush(resource(alice, "removed", "synthetic"));
        var retained = resources.saveAndFlush(resource(alice, "retained", "synthetic"));
        resources.delete(removed);
        resources.flush();
        entityManager.clear();
        assertThat(users.existsById(alice.getId())).isTrue();
        assertThat(resources.existsById(removed.getId())).isFalse();
        assertThat(resources.existsById(retained.getId())).isTrue();
    }

    @Test
    void deletingAnOwnerWithSavedRowsIsRestrictedRatherThanImplicitlyCascaded() {
        resources.saveAndFlush(resource(alice, "fixture-1", "synthetic"));
        assertThatThrownBy(() -> users.deleteAllByIdInBatch(java.util.List.of(alice.getId())))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
