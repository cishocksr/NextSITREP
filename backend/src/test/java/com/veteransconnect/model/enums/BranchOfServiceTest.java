package com.veteransconnect.model.enums;

import com.veteransconnect.model.enums.BranchOfService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Branch of Service Enum Tests")
class BranchOfServiceTest {

    @Test
    @DisplayName("Should have exactly 6 branch values")
    void shouldHaveExactly6BranchValues() {
        assertThat(BranchOfService.values()).hasSize(6);
    }

    // ========== DISPLAY NAMES ==========

    @Nested
    @DisplayName("Display Names")
    class DisplayNames {

        @ParameterizedTest
        @EnumSource(BranchOfService.class)
        @DisplayName("Should have non-null display name for all branches")
        void shouldHaveNonNullDisplayName(BranchOfService branch) {
            assertThat(branch.getDisplayName())
                    .isNotNull()
                    .isNotBlank();
        }
    }

    // ========== LOOKUP ==========

    @Nested
    @DisplayName("Lookup from Display Name")
    class Lookup {

        @ParameterizedTest
        @EnumSource(BranchOfService.class)
        @DisplayName("Should find all branches by display name")
        void shouldFindAllBranchesByDisplayName(BranchOfService branch) {
            BranchOfService result = BranchOfService.fromDisplayName(branch.getDisplayName());
            assertThat(result).isEqualTo(branch);
        }

        @ParameterizedTest
        @ValueSource(strings = {"Army", "army", "ARMY", "aRmY"})
        @DisplayName("Should be case insensitive")
        void shouldBeCaseInsensitive(String displayName) {
            BranchOfService result = BranchOfService.fromDisplayName(displayName);
            assertThat(result).isEqualTo(BranchOfService.ARMY);
        }
    }

    // ========== INVALID INPUTS ==========

    @Nested
    @DisplayName("Invalid Inputs")
    class InvalidInputs {

        @ParameterizedTest
        @ValueSource(strings = {"Invalid", "National Guard", "Reserves"})
        @DisplayName("Should throw exception for invalid names")
        void shouldThrowExceptionForInvalidNames(String invalidName) {
            assertThatThrownBy(() -> BranchOfService.fromDisplayName(invalidName))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Invalid branch of service");
        }
    }
}