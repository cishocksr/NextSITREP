package com.veteransconnect.model;

import com.veteransconnect.model.enums.BranchOfService;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @NotBlank(message = "First name is required")
    @Column(nullable = false)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Column(nullable = false)
    private String lastName;

    @NotNull(message = "Branch of Service is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "branch_of_service", nullable = false, length = 50)
    private BranchOfService branchOfService;

    @NotBlank(message = "Zip code is required")
    @Pattern(regexp = "\\d{5}", message = "ZIP code must be exactly 5 digits")
    @Column(name = "zip_code", length = 5)
    private String zipCode;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Get user's full name
     * @return concatenated first and last name
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }
}