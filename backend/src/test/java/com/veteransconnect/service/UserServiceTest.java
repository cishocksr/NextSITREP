package com.veteransconnect.service;

import com.veteransconnect.dto.UserRegistrationRequest;
import com.veteransconnect.dto.UserResponse;
import com.veteransconnect.exception.DuplicateEmailException;
import com.veteransconnect.exception.UserNotFoundException;
import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;
import com.veteransconnect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("User Service Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserServiceImpl userService;

    private UserRegistrationRequest validRequest;
    private User validUser;

    @BeforeEach
    void setUp() {
        validRequest = new UserRegistrationRequest(
                "veteran@example.com",
                "John",
                "Doe",
                BranchOfService.ARMY,
                "12345"
        );

        validUser = User.builder()
                .id(UUID.randomUUID())
                .email("veteran@example.com")
                .firstName("John")
                .lastName("Doe")
                .branchOfService(BranchOfService.ARMY)
                .zipCode("12345")
                .build();
    }

    // ========== REGISTRATION TESTS ==========

    @Test
    @DisplayName("Should register new user successfully")
    void shouldRegisterNewUserSuccessfully() {
        // Given
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(validUser);

        // When
        UserResponse response = userService.registerUser(validRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.email()).isEqualTo(validRequest.email());
        assertThat(response.firstName()).isEqualTo(validRequest.firstName());
        assertThat(response.lastName()).isEqualTo(validRequest.lastName());

        verify(userRepository).existsByEmail(validRequest.email());
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception when email already exists")
    void shouldThrowExceptionWhenEmailAlreadyExists() {
        // Given
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.registerUser(validRequest))
                .isInstanceOf(DuplicateEmailException.class)
                .hasMessageContaining("Email already registered");

        verify(userRepository).existsByEmail(validRequest.email());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception for invalid branch of service")
    void shouldThrowExceptionForInvalidBranchOfService() {
        // Given
        UserRegistrationRequest invalidRequest = new UserRegistrationRequest(
                "veteran@example.com",
                "John",
                "Doe",
                null,
                "12345"
        );

        // When & Then
        assertThatThrownBy(() -> userService.registerUser(invalidRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid branch of service");

        verify(userRepository, never()).save(any(User.class));
    }

    // ========== RETRIEVAL TESTS ==========

    @Test
    @DisplayName("Should find user by ID")
    void shouldFindUserById() {
        // Given
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(validUser));

        // When
        UserResponse response = userService.getUserById(userId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.email()).isEqualTo(validUser.getEmail());
        verify(userRepository).findById(userId);
    }

    @Test
    @DisplayName("Should throw exception when user not found by ID")
    void shouldThrowExceptionWhenUserNotFoundById() {
        // Given
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.getUserById(userId))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User not found");

        verify(userRepository).findById(userId);
    }

    @Test
    @DisplayName("Should find user by email")
    void shouldFindUserByEmail() {
        // Given
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(validUser));

        // When
        UserResponse response = userService.getUserByEmail("veteran@example.com");

        // Then
        assertThat(response).isNotNull();
        assertThat(response.email()).isEqualTo(validUser.getEmail());
        verify(userRepository).findByEmail("veteran@example.com");
    }

    @Test
    @DisplayName("Should throw exception when user not found by email")
    void shouldThrowExceptionWhenUserNotFoundByEmail() {
        // Given
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.getUserByEmail("nonexistent@example.com"))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User not found");

        verify(userRepository).findByEmail("nonexistent@example.com");
    }

    @Test
    @DisplayName("Should find users by branch of service")
    void shouldFindUsersByBranchOfService() {
        // Given
        List<User> users = List.of(validUser);
        when(userRepository.findByBranchOfService(BranchOfService.ARMY))
                .thenReturn(users);

        // When
        List<UserResponse> responses = userService.getUsersByBranch(BranchOfService.ARMY);

        // Then
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).email()).isEqualTo(validUser.getEmail());
        verify(userRepository).findByBranchOfService(BranchOfService.ARMY);
    }

    @Test
    @DisplayName("Should find users by zip code")
    void shouldFindUsersByZipCode() {
        // Given
        List<User> users = List.of(validUser);
        when(userRepository.findByZipCode("12345")).thenReturn(users);

        // When
        List<UserResponse> responses = userService.getUsersByZipCode("12345");

        // Then
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).zipCode()).isEqualTo("12345");
        verify(userRepository).findByZipCode("12345");
    }

    @Test
    @DisplayName("Should return empty list when no users in branch")
    void shouldReturnEmptyListWhenNoUsersInBranch() {
        // Given
        when(userRepository.findByBranchOfService(BranchOfService.NAVY))
                .thenReturn(List.of());

        // When
        List<UserResponse> responses = userService.getUsersByBranch(BranchOfService.NAVY);

        // Then
        assertThat(responses).isEmpty();
        verify(userRepository).findByBranchOfService(BranchOfService.NAVY);
    }

    @Test
    @DisplayName("Should return empty list when no users in zip code")
    void shouldReturnEmptyListWhenNoUsersInZipCode() {
        // Given
        when(userRepository.findByZipCode("99999")).thenReturn(List.of());

        // When
        List<UserResponse> responses = userService.getUsersByZipCode("99999");

        // Then
        assertThat(responses).isEmpty();
        verify(userRepository).findByZipCode("99999");
    }
}