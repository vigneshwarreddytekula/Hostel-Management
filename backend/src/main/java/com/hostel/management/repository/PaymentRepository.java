package com.hostel.management.repository;

import com.hostel.management.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRazorpayOrderId(String orderId);
    List<Payment> findByRentRecordBookingTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<Payment> findByRentRecordBookingRoomHostelOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
