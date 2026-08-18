package com.veteransconnect.model;

import com.veteransconnect.model.enums.ResourceCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a resource that a veteran has chosen to save to their personal library.
 */
@Entity
@Table(
        name = "saved_resources",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_saved_resource_user_external",
                        columnNames = {"user_id", "external_id", "source_api"}
                )
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavedResource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "external_id", nullable = false)
    private String externalId;

    @Column(name = "source_api", nullable = false, length = 50)
    private String sourceApi;

    @Column(name = "resource_name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private ResourceCategory category;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "website")
    private String website;

    @Column(name = "address")
    private String address;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 2)
    private String state;

    @Column(name = "zip_code", length = 10)
    private String zipCode;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "saved_at", nullable = false, updatable = false)
    private LocalDateTime savedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
