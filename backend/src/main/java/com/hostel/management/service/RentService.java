package com.hostel.management.service;

import com.hostel.management.dto.Mappers;
import com.hostel.management.dto.OpsDtos;
import com.hostel.management.entity.Booking;
import com.hostel.management.entity.Hostel;
import com.hostel.management.entity.LeaveRequest;
import com.hostel.management.entity.RentRecord;
import com.hostel.management.entity.User;
import com.hostel.management.enums.BookingStatus;
import com.hostel.management.enums.LeaveStatus;
import com.hostel.management.enums.NotificationType;
import com.hostel.management.enums.RentStatus;
import com.hostel.management.enums.Role;
import com.hostel.management.exception.ApiException;
import com.hostel.management.repository.BookingRepository;
import com.hostel.management.repository.LeaveRequestRepository;
import com.hostel.management.repository.RentRecordRepository;
import com.hostel.management.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RentService {
    private final RentRecordRepository rentRecordRepository;
    private final BookingRepository bookingRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    @Transactional
    public RentRecord ensureCurrentMonthRent(Booking booking) {
        YearMonth ym = YearMonth.now();
        return rentRecordRepository.findByBookingIdAndYearAndMonth(booking.getId(), ym.getYear(), ym.getMonthValue())
                .orElseGet(() -> createForMonth(booking, ym));
    }

    @Transactional
    public void generateMonthlyRents() {
        YearMonth ym = YearMonth.now();
        List<Booking> active = bookingRepository.findByStatus(BookingStatus.ACTIVE);
        for (Booking booking : active) {
            rentRecordRepository.findByBookingIdAndYearAndMonth(booking.getId(), ym.getYear(), ym.getMonthValue())
                    .orElseGet(() -> {
                        RentRecord created = createForMonth(booking, ym);
                        notificationService.notify(booking.getTenant(), NotificationType.RENT_DUE,
                                "Rent due for " + ym,
                                "Your rent of ₹" + created.getFinalRent() + " is due.");
                        return created;
                    });
        }
    }

    @Transactional
    public void markOverdue() {
        Instant now = Instant.now();
        for (RentRecord rr : rentRecordRepository.findByStatus(RentStatus.PENDING)) {
            if (rr.getDueDate() != null && rr.getDueDate().isBefore(now)) {
                rr.setStatus(RentStatus.OVERDUE);
                rentRecordRepository.save(rr);
                notificationService.notify(rr.getBooking().getTenant(), NotificationType.RENT_DUE,
                        "Rent overdue",
                        "Your rent for " + rr.getMonth() + "/" + rr.getYear() + " is overdue.");
            }
        }
    }

    public List<OpsDtos.RentResponse> listMine() {
        User user = currentUserService.requireCurrentUser();
        if (user.getRole() == Role.OWNER || user.getRole() == Role.ADMIN) {
            return rentRecordRepository.findByBookingRoomHostelOwnerIdOrderByYearDescMonthDesc(user.getId())
                    .stream().map(Mappers::toRent).toList();
        }
        return rentRecordRepository.findByBookingTenantIdOrderByYearDescMonthDesc(user.getId())
                .stream().map(Mappers::toRent).toList();
    }

    @Transactional
    public OpsDtos.RentResponse addCharges(Long rentId, BigDecimal amount) {
        RentRecord rr = getOwnedRent(rentId);
        if (rr.getStatus() == RentStatus.PAID) {
            throw ApiException.badRequest("Cannot modify paid rent");
        }
        rr.setAdditionalCharges(rr.getAdditionalCharges().add(amount));
        recalculateFinal(rr);
        return Mappers.toRent(rentRecordRepository.save(rr));
    }

    @Transactional
    public void recalculateForBooking(Long bookingId) {
        for (RentRecord rr : rentRecordRepository.findByBookingId(bookingId)) {
            if (rr.getStatus() == RentStatus.PAID) continue;
            rr.setLeaveDeduction(computeLeaveDeduction(rr.getBooking(), rr.getYear(), rr.getMonth()));
            recalculateFinal(rr);
            rentRecordRepository.save(rr);
        }
    }

    public RentRecord getEntity(Long id) {
        return rentRecordRepository.findById(id).orElseThrow(() -> ApiException.notFound("Rent record not found"));
    }

    private RentRecord createForMonth(Booking booking, YearMonth ym) {
        BigDecimal base = booking.getRoom().getMonthlyRent();
        BigDecimal deduction = computeLeaveDeduction(booking, ym.getYear(), ym.getMonthValue());
        RentRecord rr = RentRecord.builder()
                .booking(booking)
                .year(ym.getYear())
                .month(ym.getMonthValue())
                .baseRent(base)
                .leaveDeduction(deduction)
                .additionalCharges(BigDecimal.ZERO)
                .finalRent(base.subtract(deduction).max(BigDecimal.ZERO))
                .status(RentStatus.PENDING)
                .dueDate(ym.atDay(Math.min(5, ym.lengthOfMonth())).atStartOfDay().toInstant(ZoneOffset.UTC))
                .build();
        return rentRecordRepository.save(rr);
    }

    public BigDecimal computeLeaveDeduction(Booking booking, int year, int month) {
        Hostel hostel = booking.getRoom().getHostel();
        if (!hostel.isLeaveDeductionEnabled()) {
            return BigDecimal.ZERO;
        }
        YearMonth ym = YearMonth.of(year, month);
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();
        List<LeaveRequest> leaves = leaveRequestRepository.findByBookingIdAndStatus(booking.getId(), LeaveStatus.APPROVED);
        int days = 0;
        for (LeaveRequest leave : leaves) {
            LocalDate start = leave.getStartDate().isBefore(monthStart) ? monthStart : leave.getStartDate();
            LocalDate end = leave.getEndDate().isAfter(monthEnd) ? monthEnd : leave.getEndDate();
            if (!end.isBefore(start)) {
                days += (int) ChronoUnit.DAYS.between(start, end) + 1;
            }
        }
        if (days <= 0) return BigDecimal.ZERO;
        BigDecimal monthly = booking.getRoom().getMonthlyRent();
        if (hostel.isUseProrataDeduction()) {
            BigDecimal perDay = monthly.divide(BigDecimal.valueOf(ym.lengthOfMonth()), 2, RoundingMode.HALF_UP);
            return perDay.multiply(BigDecimal.valueOf(days)).setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal fixed = hostel.getFixedDeductionPerDay() != null
                ? hostel.getFixedDeductionPerDay()
                : monthly.divide(BigDecimal.valueOf(ym.lengthOfMonth()), 2, RoundingMode.HALF_UP);
        return fixed.multiply(BigDecimal.valueOf(days)).setScale(2, RoundingMode.HALF_UP);
    }

    private void recalculateFinal(RentRecord rr) {
        BigDecimal finalRent = rr.getBaseRent()
                .subtract(rr.getLeaveDeduction())
                .add(rr.getAdditionalCharges());
        if (finalRent.compareTo(BigDecimal.ZERO) < 0) finalRent = BigDecimal.ZERO;
        rr.setFinalRent(finalRent);
    }

    private RentRecord getOwnedRent(Long rentId) {
        RentRecord rr = getEntity(rentId);
        User me = currentUserService.requireCurrentUser();
        Long ownerId = rr.getBooking().getRoom().getHostel().getOwner().getId();
        if (!ownerId.equals(me.getId()) && me.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Not your rent record");
        }
        return rr;
    }
}
