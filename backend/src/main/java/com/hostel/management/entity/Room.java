package com.hostel.management.entity;

import com.hostel.management.enums.RoomCategory;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "hostel_id")
    private Hostel hostel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomCategory category;

    private String sharingType;

    @Column(nullable = false)
    private BigDecimal monthlyRent;

    @Column(nullable = false)
    private int totalBeds;

    @Column(nullable = false)
    private int availableBeds;

    @Column(length = 1000)
    private String amenities;

    private boolean active = true;
}
