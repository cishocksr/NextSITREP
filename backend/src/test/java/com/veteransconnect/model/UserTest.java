package com.veteransconnect.model;

import com.veteransconnect.model.enums.BranchOfService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("User Entity Tests")
class UserTest {

    // ========== TEST DATA ==========

    private static final String VALID_EMAIL = "veteran@example.com";
    private static final String VALID_FIRST_NAME = "John";
    private static final String VALID_LAST_NAME = "Doe";
    private static final BranchOfService VALID_BRANCH = BranchOfService.ARMY;

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    // ========== HAPPY PATH ==========

    @Test
    @DisplayName("Should create user with valid data")
    void shouldCreateUserWithValidData() {
        User user = createValidUser().build();
        assertNoViolations(user);
    }

    // ========== EMAIL VALIDATION ==========

    @Nested
    @DisplayName("Email Validation")
    class EmailValidation {

        @ParameterizedTest
        @NullAndEmptySource
        @DisplayName("Should reject null or blank email")
        void shouldRejectNullOrBlankEmail(String email) {
            User user = createValidUser().email(email).build();
            assertHasViolations(user);
        }

        @Test
        @DisplayName("Should reject invalid email format")
        void shouldRejectInvalidEmailFormat() {
            User user = createValidUser().email("not-an-email").build();
            assertInvalidUser(user, "Must be a valid email address");
        }
    }

    // ========== FIRST NAME VALIDATION ==========

    @Nested
    @DisplayName("First Name Validation")
    class FirstNameValidation {

        @ParameterizedTest
        @NullAndEmptySource
        @DisplayName("Should reject null or blank first name")
        void shouldRejectNullOrBlankFirstName(String firstName) {
            User user = createValidUser().firstName(firstName).build();
            assertHasViolations(user);
        }
    }

    // ========== LAST NAME VALIDATION ==========

    @Nested
    @DisplayName("Last Name Validation")
    class LastNameValidation {

        @ParameterizedTest
        @NullAndEmptySource
        @DisplayName("Should reject null or blank last name")
        void shouldRejectNullOrBlankLastName(String lastName) {
            User user = createValidUser().lastName(lastName).build();
            assertHasViolations(user);
        }
    }

    // ========== BRANCH OF SERVICE VALIDATION ==========

    @Nested
    @DisplayName("Branch of Service Validation")
    class BranchOfServiceValidation {

        @Test
        @DisplayName("Should reject null branch of service")
        void shouldRejectNullBranchOfService() {
            User user = createValidUser().branchOfService(null).build();
            assertInvalidUser(user, "Branch of Service is required");
        }

        @ParameterizedTest
        @EnumSource(BranchOfService.class)
        @DisplayName("Should accept all valid branch values")
        void shouldAcceptAllValidBranchValues(BranchOfService branch) {
            User user = createValidUser().branchOfService(branch).build();
            assertNoViolations(user);
        }
    }

    // ========== ZIP CODE VALIDATION ==========

    @Nested
    @DisplayName("Zip Code Validation")
    class ZipCodeValidation {

        @ParameterizedTest
        @NullAndEmptySource
        @DisplayName("Should reject null or blank zip code")
        void shouldRejectNullOrBlankZipCode(String zipCode) {
            User user = createValidUser().zipCode(null).build();
            assertInvalidUser(user, "Zip code is required");
        }

        @ParameterizedTest
        @ValueSource(strings = {"12345", "1234567890"})
        @DisplayName("Should accept valid zip codes")
        void shouldAcceptValidZipCodes(String zipCode) {
            User user = createValidUser().zipCode(zipCode).build();
            assertNoViolations(user);
        }

        @ParameterizedTest
        @ValueSource(strings = {"12345678901", "123456789012345"})
        @DisplayName("Should reject zip codes longer than 10 characters")
        void shouldRejectTooLongZipCodes(String zipCode) {
            User user = createValidUser().zipCode(zipCode).build();
            assertInvalidUser(user, "Zip code must be less than 10 characters");
        }
    }

    // ========== BUSINESS LOGIC ==========

    @Nested
    @DisplayName("Business Logic")
    class BusinessLogic {

        @Test
        @DisplayName("Should generate full name from first and last name")
        void shouldGenerateFullName() {
            User user = createValidUser().build();
            assertThat(user.getFullName()).isEqualTo("John Doe");
        }
    }

    // ========== HELPER METHODS ==========
    private static final String VALID_ZIP_CODE = "12345";

    private User.UserBuilder createValidUser() {
        return User.builder()
                .email(VALID_EMAIL)
                .firstName(VALID_FIRST_NAME)
                .lastName(VALID_LAST_NAME)
                .branchOfService(VALID_BRANCH)
                .zipCode(VALID_ZIP_CODE);

    }

    private void assertHasViolations(User user) {
        Set<ConstraintViolation<User>> violations = validator.validate(user);
        assertThat(violations).isNotEmpty();
    }

    private void assertNoViolations(User user) {
        Set<ConstraintViolation<User>> violations = validator.validate(user);
        assertThat(violations).isEmpty();
    }

    private void assertInvalidUser(User user, String expectedMessage) {
        Set<ConstraintViolation<User>> violations = validator.validate(user);
        assertThat(violations)
                .isNotEmpty()
                .extracting(ConstraintViolation::getMessage)
                .contains(expectedMessage);
    }
}