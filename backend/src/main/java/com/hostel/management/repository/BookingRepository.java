package com.hostel.management.repository;

import com.hostel.management.entity.Booking;
import com.hostel.management.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<Booking> findByRoomHostelOwnerIdOrderByCreatedAtDesc(Long ownerId);
    List<Booking> findByRoomHostelId(Long hostelId);
    List<Booking> findByStatus(BookingStatus status);
    long countByRoomHostelOwnerIdAndStatusIn(Long ownerId, List<BookingStatus> statuses);
    long countByStatus(BookingStatus status);
}
