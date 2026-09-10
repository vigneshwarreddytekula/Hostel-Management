package com.hostel.management.repository;

import com.hostel.management.entity.LeaveRequest;
import com.hostel.management.enums.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<LeaveRequest> findByBookingRoomHostelOwnerIdOrderByCreatedAtDesc(Long ownerId);
    List<LeaveRequest> findByBookingIdAndStatus(Long bookingId, LeaveStatus status);
}
