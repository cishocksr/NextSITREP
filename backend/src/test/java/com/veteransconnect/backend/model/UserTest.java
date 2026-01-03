package com.veteransconnect.backend.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
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
                .build();

        // When: Validate the user
        Set<ConstraintViolation<User>> violations = validator.validate(user);

        // Then: No validation errors
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should reject user with invalid email format")
    void shouldRejectUserWithInvalidEMailFormat() {
        User user = User.builder()
                .email("not-an-email")
                .firstName("John")
                .lastName("Doe")
                .build();

        Set<ConstraintViolation<User>> violations = validator.validate(user);

        assertThat(violations).isNotEmpty();
    }

    @Test
    @DisplayName("Should reject user with blank first name")
    void shouldRejectUserWithBlankFirstName() {
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("")
                .lastName("Doe")
                .build();

        Set<ConstraintViolation<User>> violations = validator.validate(user);

        assertThat(violations).isNotEmpty();

    }

    @Test
    @DisplayName("Should generate full name from first and last name")
    void shouldGenerateFullName() {
        User user = User.builder()
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .build();

        String fullName = user.getFullName();
        assertThat(fullName).isEqualTo("John Doe");
    }
}