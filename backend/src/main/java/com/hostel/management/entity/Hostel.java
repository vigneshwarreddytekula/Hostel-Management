package com.hostel.management.entity;

import com.hostel.management.enums.GenderPreference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "hostels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hostel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false)
    private String name;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String city;

    private Double latitude;
    private Double longitude;

    @Enumerated(EnumType.STRING)
    private GenderPreference genderPreference;

    @Column(length = 2000)
    private String amenities;

    @Column(length = 4000)
    private String imageUrls;

    private boolean verified;

    private boolean leaveDeductionEnabled = true;

    private boolean useProrataDeduction = true;

    private BigDecimal fixedDeductionPerDay;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
