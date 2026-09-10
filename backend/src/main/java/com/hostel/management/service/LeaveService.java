package com.hostel.management.service;

import com.hostel.management.dto.Mappers;
import com.hostel.management.dto.OpsDtos;
import com.hostel.management.entity.Booking;
import com.hostel.management.entity.LeaveRequest;
import com.hostel.management.entity.User;
import com.hostel.management.enums.BookingStatus;
import com.hostel.management.enums.LeaveStatus;
import com.hostel.management.enums.NotificationType;
import com.hostel.management.enums.Role;
import com.hostel.management.exception.ApiException;
import com.hostel.management.repository.LeaveRequestRepository;
import com.hostel.management.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveService {
    private final LeaveRequestRepository leaveRequestRepository;
    private final BookingService bookingService;
    private final RentService rentService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    @Transactional
    public OpsDtos.LeaveResponse apply(OpsDtos.LeaveRequestDto req) {
        User tenant = currentUserService.requireCurrentUser();
        if (tenant.getRole() != Role.TENANT) {
            throw ApiException.forbidden("Only tenants can apply for leave");
        }
        Booking booking = bookingService.getEntity(req.getBookingId());
        if (!booking.getTenant().getId().equals(tenant.getId())) {
            throw ApiException.forbidden("Not your booking");
        }
        if (booking.getStatus() != BookingStatus.ACTIVE) {
            throw ApiException.badRequest("Leave only allowed for active bookings");
        }
        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw ApiException.badRequest("Invalid leave dates");
        }
        LeaveRequest leave = LeaveRequest.builder()
                .tenant(tenant)
                .booking(booking)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .reason(req.getReason())
                .status(LeaveStatus.PENDING)
                .build();
        leaveRequestRepository.save(leave);
        notificationService.notify(booking.getRoom().getHostel().getOwner(), NotificationType.LEAVE_UPDATE,
                "Leave request",
                tenant.getName() + " requested leave from " + req.getStartDate() + " to " + req.getEndDate());
        return Mappers.toLeave(leave);
    }

    public List<OpsDtos.LeaveResponse> listMine() {
        User user = currentUserService.requireCurrentUser();
        if (user.getRole() == Role.OWNER || user.getRole() == Role.ADMIN) {
            return leaveRequestRepository.findByBookingRoomHostelOwnerIdOrderByCreatedAtDesc(user.getId())
                    .stream().map(Mappers::toLeave).toList();
        }
        return leaveRequestRepository.findByTenantIdOrderByCreatedAtDesc(user.getId())
                .stream().map(Mappers::toLeave).toList();
    }

    @Transactional
    public OpsDtos.LeaveResponse decide(Long id, boolean approve) {
        LeaveRequest leave = leaveRequestRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Leave request not found"));
        User owner = currentUserService.requireCurrentUser();
        Long hostelOwnerId = leave.getBooking().getRoom().getHostel().getOwner().getId();
        if (!hostelOwnerId.equals(owner.getId()) && owner.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Not your leave request");
        }
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw ApiException.badRequest("Leave already decided");
        }
        if (approve) {
            int days = (int) ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
            leave.setApprovedDays(days);
            leave.setStatus(LeaveStatus.APPROVED);
            rentService.recalculateForBooking(leave.getBooking().getId());
            notificationService.notify(leave.getTenant(), NotificationType.LEAVE_UPDATE,
                    "Leave approved",
                    "Your leave (" + days + " days) was approved.");
        } else {
            leave.setStatus(LeaveStatus.REJECTED);
            leave.setApprovedDays(0);
            notificationService.notify(leave.getTenant(), NotificationType.LEAVE_UPDATE,
                    "Leave rejected",
                    "Your leave request was rejected.");
        }
        return Mappers.toLeave(leaveRequestRepository.save(leave));
    }
}
