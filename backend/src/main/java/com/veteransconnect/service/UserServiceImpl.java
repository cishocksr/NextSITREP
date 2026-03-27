package com.veteransconnect.service;

import com.veteransconnect.dto.UserRegistrationRequest;
import com.veteransconnect.dto.UserResponse;
import com.veteransconnect.exception.DuplicateEmailException;
import com.veteransconnect.exception.UserNotFoundException;
import com.veteransconnect.model.User;
import com.veteransconnect.model.enums.BranchOfService;
import com.veteransconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Implementation of UserService interface.
 * Handles business logic for user operations.
 *
 * @RequiredArgsConstructor generates a constructor for all final fields,
 * which Spring uses for dependency injection (constructor injection is preferred
 * over @Autowired field injection — it makes dependencies explicit and testable).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    // PasswordEncoder is defined as a @Bean in SecurityConfig.
    // We inject it here to BCrypt-hash passwords before storing them.
    // This way the service layer never touches plaintext passwords.
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponse registerUser(UserRegistrationRequest request) {
        if (request.branchOfService() == null) {
            throw new IllegalArgumentException("Invalid branch of service");
        }

        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException("Email already registered: " + request.email());
        }

        User user = mapToEntity(request);
        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
        return mapToResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
        return mapToResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByBranch(BranchOfService branch) {
        return userRepository.findByBranchOfService(branch).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByZipCode(String zipCode) {
        return userRepository.findByZipCode(zipCode).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ========== HELPER METHODS ==========

    /**
     * Convert User entity to UserResponse DTO.
     */
    private UserResponse mapToResponse(User user) {
        return UserResponse.from(user);
    }

    /**
     * Convert UserRegistrationRequest DTO to User entity.
     *
     * KEY SECURITY STEP: the password from the request is a plaintext string.
     * We hash it with BCrypt here so only the hash is ever stored.
     * BCrypt is one-way — you can never recover the original password from the hash,
     * which means even if your database is stolen, passwords remain protected.
     */
    private User mapToEntity(UserRegistrationRequest request) {
        return User.builder()
                .email(request.email())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .branchOfService(request.branchOfService())
                .zipCode(request.zipCode())
                // Hash the plaintext password before storing — NEVER store raw passwords
                .passwordHash(passwordEncoder.encode(request.password()))
                .build();
    }
}
