package com.hostel.management.entity;

import com.hostel.management.enums.RentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "rent_records", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"booking_id", "rent_year", "rent_month"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(name = "rent_year", nullable = false)
    private int year;

    @Column(name = "rent_month", nullable = false)
    private int month;

    @Column(nullable = false)
    private BigDecimal baseRent;

    @Column(nullable = false)
    private BigDecimal leaveDeduction;

    @Column(nullable = false)
    private BigDecimal additionalCharges;

    @Column(nullable = false)
    private BigDecimal finalRent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RentStatus status;

    private Instant dueDate;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
