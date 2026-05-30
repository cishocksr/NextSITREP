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

        User user = createValidUser().build();
        User savedUser = repository.save(user);

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

        User user = createValidUser().build();
        User savedUser = entityManager.persistAndFlush(user);
        UUID userId = savedUser.getId();

        Optional<User> foundUser = repository.findById(userId);

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo(VALID_EMAIL);
    }

    @Test
    @DisplayName("Should find user by email")
    void shouldFindUserByEmail() {

        User user = createValidUser().build();
        entityManager.persistAndFlush(user);

        Optional<User> foundUser = repository.findByEmail(VALID_EMAIL);

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getFirstName()).isEqualTo(VALID_FIRST_NAME);
        assertThat(foundUser.get().getLastName()).isEqualTo(VALID_LAST_NAME);
    }

    @Test
    @DisplayName("Should return empty when email not found")
    void shouldReturnEmptyWhenEmailNotFound() {

        Optional<User> foundUser = repository.findByEmail("nonexistent@example.com");

        assertThat(foundUser).isEmpty();
    }

    @Test
    @DisplayName("Should check if user exists by email")
    void shouldCheckIfUserExistsByEmail() {

        User user = createValidUser().build();
        repository.save(user);

        assertThat(repository.existsByEmail(VALID_EMAIL)).isTrue();
        assertThat(repository.existsByEmail("nonexistent@example.com")).isFalse();
    }

    @Test
    @DisplayName("Should find users by branch of service")
    void shouldFindUsersByBranchOfService() {

        User user1 = createValidUser().build();
        User user2 = createValidUser()
                .email("another@example.com")
                .branchOfService(BranchOfService.ARMY)
                .build();

        repository.save(user1);
        repository.save(user2);

        List<User> navyUsers = repository.findByBranchOfService(BranchOfService.NAVY);
        List<User> armyUsers = repository.findByBranchOfService(BranchOfService.ARMY);

        assertThat(navyUsers).hasSize(1);
        assertThat(navyUsers.get(0).getBranchOfService()).isEqualTo(BranchOfService.NAVY);

        assertThat(armyUsers).hasSize(1);
        assertThat(armyUsers.get(0).getBranchOfService()).isEqualTo(BranchOfService.ARMY);
    }

    @Test
    @DisplayName("Should find users by zipcode")
    void shouldFindUsersByZipCode() {

        User user = createValidUser().build();
        repository.save(user);

        List<User> foundUsers = repository.findByZipCode(VALID_ZIP_CODE);

        assertThat(foundUsers).hasSize(1);
        assertThat(foundUsers.get(0).getZipCode()).isEqualTo(VALID_ZIP_CODE);
        assertThat(foundUsers.get(0).getEmail()).isEqualTo(VALID_EMAIL);
    }

    @Test
    @DisplayName("Should find multiple users by zipcode")
    void shouldFindMultipleUsersByZipCode() {

        User user1 = createValidUser().build();
        User user2 = createValidUser()
                .email("another@example.com")
                .firstName("Different")
                .build();

        repository.save(user1);
        repository.save(user2);

        List<User> foundUsers = repository.findByZipCode(VALID_ZIP_CODE);

        assertThat(foundUsers).hasSize(2);
        assertThat(foundUsers)
                .extracting(User::getZipCode)
                .containsOnly(VALID_ZIP_CODE);
    }

    @Test
    @DisplayName("Should return empty list when no users in zipcode")
    void shouldReturnEmptyListWhenNoUsersInZipCode() {

        List<User> foundUsers = repository.findByZipCode("99999");

        assertThat(foundUsers).isEmpty();
    }

    // ========== HELPER METHODS ==========

    private User.UserBuilder createValidUser() {
        return User.builder()
                .email(VALID_EMAIL)
                .firstName(VALID_FIRST_NAME)
                .lastName(VALID_LAST_NAME)
                .branchOfService(VALID_BRANCH)
                .zipCode(VALID_ZIP_CODE)
                .passwordHash("$2a$10$012345678901234567890u01234567890123456789012345678901234");
    }
}
