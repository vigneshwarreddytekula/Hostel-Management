package com.hostel.management.repository;

import com.hostel.management.entity.RentRecord;
import com.hostel.management.enums.RentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface RentRecordRepository extends JpaRepository<RentRecord, Long> {
    List<RentRecord> findByBookingTenantIdOrderByYearDescMonthDesc(Long tenantId);
    List<RentRecord> findByBookingRoomHostelOwnerIdOrderByYearDescMonthDesc(Long ownerId);
    Optional<RentRecord> findByBookingIdAndYearAndMonth(Long bookingId, int year, int month);
    List<RentRecord> findByStatus(RentStatus status);
    List<RentRecord> findByBookingId(Long bookingId);

    @Query("SELECT COALESCE(SUM(r.finalRent), 0) FROM RentRecord r WHERE r.booking.room.hostel.owner.id = :ownerId AND r.status = 'PAID' AND r.year = :year AND r.month = :month")
    BigDecimal sumPaidIncomeForOwnerMonth(Long ownerId, int year, int month);

    @Query("SELECT COUNT(r) FROM RentRecord r WHERE r.booking.room.hostel.owner.id = :ownerId AND r.status = :status")
    long countByOwnerAndStatus(Long ownerId, RentStatus status);

    @Query("SELECT COALESCE(SUM(r.finalRent), 0) FROM RentRecord r WHERE r.status = 'PAID'")
    BigDecimal sumAllPaid();
}
