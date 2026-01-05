package com.veteransconnect.repository;

import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@DisplayName("User Repository Tests")
class UserRepositoryTest {

    private static final String VALID_EMAIL = "veteran@example.com";
    private static final String VALID_FIRST_NAME = "Sailor";
    private static final String VALID_LAST_NAME = "Jerry";
    private static final BranchOfService VALID_BRANCH = BranchOfService.NAVY;
    private static final String VALID_ZIP_CODE = "12345";

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository repository;

    @Test
    @DisplayName("Should save user to database")
    void shouldSaveUserToDatabase() {
        // Arrange
        User user = createValidUser().build();

        // Act
        User savedUser = repository.save(user);

        // Assert
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getEmail()).isEqualTo(VALID_EMAIL);
        assertThat(savedUser.getFirstName()).isEqualTo(VALID_FIRST_NAME);
        assertThat(savedUser.getLastName()).isEqualTo(VALID_LAST_NAME);
        assertThat(savedUser.getZipCode()).isEqualTo(VALID_ZIP_CODE);
        assertThat(savedUser.getBranchOfService()).isEqualTo(VALID_BRANCH);
    }

    @Test
    @DisplayName("Should find user by ID")
    void shouldFindUserById() {
        // Arrange
        User user = createValidUser().build();
        User savedUser = entityManager.persistAndFlush(user);
        UUID userId = savedUser.getId();

        // Act
        Optional<User> foundUser = repository.findById(userId);

        // Assert
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo(VALID_EMAIL);
    }

    @Test
    @DisplayName("Should find user by email")
    void shouldFindUserByEmail() {
        // Arrange
        User user = createValidUser().build();
        entityManager.persistAndFlush(user);

        // Act
        Optional<User> foundUser = repository.findByEmail(VALID_EMAIL);

        // Assert
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getFirstName()).isEqualTo(VALID_FIRST_NAME);
        assertThat(foundUser.get().getLastName()).isEqualTo(VALID_LAST_NAME);
    }

    @Test
    @DisplayName("Should return empty when email not found")
    void shouldReturnEmptyWhenEmailNotFound() {
        // Arrange - Don't save any user

        // Act
        Optional<User> foundUser = repository.findByEmail("nonexistent@example.com");

        // Assert
        assertThat(foundUser).isEmpty();
    }

    @Test
    @DisplayName("Should check if user exists by email")
    void shouldCheckIfUserExistsByEmail() {
        // Arrange
        User user = createValidUser().build();
        repository.save(user);

        // Act & Assert
        assertThat(repository.existsByEmail(VALID_EMAIL)).isTrue();
        assertThat(repository.existsByEmail("nonexistent@example.com")).isFalse();
    }

    @Test
    @DisplayName("Should find users by branch of service")
    void shouldFindUsersByBranchOfService() {
        // Arrange
        User user1 = createValidUser().build();
        User user2 = createValidUser()
                .email("another@example.com")
                .branchOfService(BranchOfService.ARMY)
                .build();

        repository.save(user1);
        repository.save(user2);

        // Act
        List<User> navyUsers = repository.findByBranchOfService(BranchOfService.NAVY);
        List<User> armyUsers = repository.findByBranchOfService(BranchOfService.ARMY);

        // Assert
        assertThat(navyUsers).hasSize(1);
        assertThat(navyUsers.get(0).getBranchOfService()).isEqualTo(BranchOfService.NAVY);

        assertThat(armyUsers).hasSize(1);
        assertThat(armyUsers.get(0).getBranchOfService()).isEqualTo(BranchOfService.ARMY);
    }

    // ========== HELPER METHODS ==========

    private User.UserBuilder createValidUser() {
        return User.builder()
                .email(VALID_EMAIL)
                .firstName(VALID_FIRST_NAME)
                .lastName(VALID_LAST_NAME)
                .branchOfService(VALID_BRANCH)
                .zipCode(VALID_ZIP_CODE);
    }
}