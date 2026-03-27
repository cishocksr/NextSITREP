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
 *
 * Key design decisions:
 *
 * 1. We store a snapshot of the resource data at save time (name, phone, address, etc.)
 *    This means the veteran can still see their saved resources even if the external
 *    API changes or goes down. externalId + sourceApi together uniquely identify
 *    where this resource originally came from.
 *
 * 2. Notes are stored as plain text that supports markdown formatting.
 *    Using columnDefinition = "TEXT" allows notes to be much longer than VARCHAR(255).
 *    The frontend can render markdown (bold, bullets, etc.) if the veteran uses it.
 *
 * 3. The unique constraint on (user_id, external_id, source_api) prevents a veteran
 *    from accidentally saving the same facility twice.
 */
@Entity
@Table(
        name = "saved_resources",
        uniqueConstraints = {
                // A veteran can only save any given external resource once
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

    // Many saved resources belong to one user
    // FetchType.LAZY means the User is not loaded from the DB unless explicitly accessed
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // The ID this resource has in the external API (e.g. "vha_689" from VA Facilities API)
    @Column(name = "external_id", nullable = false)
    private String externalId;

    // Which API this resource came from (e.g. "VA_FACILITIES")
    // Allows us to add more data sources later without changing the schema
    @Column(name = "source_api", nullable = false, length = 50)
    private String sourceApi;

    // ── Snapshot of resource data at save time ────────────────────────────────

    @Column(name = "resource_name", nullable = false)
    private String name;

    // A brief description of the facility/resource
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // The category the veteran was browsing when they found this resource
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

    // ── Veteran's personal notes ──────────────────────────────────────────────
    // Plain text with optional markdown formatting (bullets, bold, etc.)
    // columnDefinition = "TEXT" allows up to ~65KB in PostgreSQL
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // ── Timestamps ────────────────────────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "saved_at", nullable = false, updatable = false)
    private LocalDateTime savedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
