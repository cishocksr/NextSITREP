package com.veteransconnect.model;

import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("User Entity Tests")
class UserTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("Should create user with valid data")
    void shouldCreateUserWithValidData() {
        // Given: Valid user data
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.ARMY)
                .zipCode("90210")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: No validation errors
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should reject user with invalid email format")
    void shouldRejectUserWithInvalidEmailFormat() {
        // Given: User with invalid email
        User user = User.builder()
                .email("not-an-email")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.NAVY)
                .zipCode("90210")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: Should have validation error
        assertThat(violations).isNotEmpty();
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Must be a valid email address");
    }

    @Test
    @DisplayName("Should reject user with blank first name")
    void shouldRejectUserWithBlankFirstName() {
        // Given: User with blank first name
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("")
                .lastName("Doe")
                .branchOfService(BranchOfService.AIR_FORCE)
                .zipCode("90210")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: Should have validation error
        assertThat(violations).isNotEmpty();
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("First name is required");
    }

    @Test
    @DisplayName("Should reject user with blank last name")
    void shouldRejectUserWithBlankLastName() {
        // Given: User with blank last name
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("")
                .branchOfService(BranchOfService.MARINE_CORPS)
                .zipCode("90210")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: Should have validation error
        assertThat(violations).isNotEmpty();
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Last name is required");
    }

    @Test
    @DisplayName("Should generate full name from first and last name")
    void shouldGenerateFullName() {
        // Given: User with first and last name
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.COAST_GUARD)
                .zipCode("90210")
                .build();

        // When: Get full name
        String fullName = user.getFullName();

        // Then: Should be concatenated properly
        assertThat(fullName).isEqualTo("John Doe");
    }

    @Test
    @DisplayName("Should create user with valid branch of service")
    void shouldCreateUserWithValidBranchOfService() {
        // Given: User with branch of service
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.SPACE_FORCE)
                .zipCode("90210")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: No validation errors
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should reject user with null branch of service")
    void shouldRejectUserWithNullBranchOfService() {
        // Given: User without branch of service
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(null)
                .zipCode("90210")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: Should have validation error
        assertThat(violations).hasSize(1);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Branch of Service is required");
    }

    @Test
    @DisplayName("Should create user with valid 5-digit zip code")
    void shouldCreateUserWithValidZipCode() {
        // Given: User with valid zip code
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.ARMY)
                .zipCode("12345")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: No validation errors
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should reject user with invalid zip code format - letters")
    void shouldRejectUserWithInvalidZipCodeLetters() {
        // Given: User with letters in zip code
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.NAVY)
                .zipCode("ABCDE")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: Should have validation error
        assertThat(violations).isNotEmpty();
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("ZIP code must be exactly 5 digits");
    }

    @Test
    @DisplayName("Should reject user with zip code too short")
    void shouldRejectUserWithZipCodeTooShort() {
        // Given: User with 4-digit zip code
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.AIR_FORCE)
                .zipCode("1234")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: Should have validation error
        assertThat(violations).isNotEmpty();
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("ZIP code must be exactly 5 digits");
    }

    @Test
    @DisplayName("Should reject user with zip code too long")
    void shouldRejectUserWithZipCodeTooLong() {
        // Given: User with 6-digit zip code
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.MARINE_CORPS)
                .zipCode("123456")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: Should have validation error
        assertThat(violations).isNotEmpty();
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("ZIP code must be exactly 5 digits");
    }

    @Test
    @DisplayName("Should reject user with blank zip code")
    void shouldRejectUserWithBlankZipCode() {
        // Given: User with blank zip code
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.COAST_GUARD)
                .zipCode("")
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: Should have validation error for blank
        assertThat(violations).isNotEmpty();
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .containsAnyOf("Zip code is required", "ZIP code must be exactly 5 digits");
    }
}
