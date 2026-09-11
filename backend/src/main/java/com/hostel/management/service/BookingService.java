package com.hostel.management.service;

import com.hostel.management.dto.Mappers;
import com.hostel.management.dto.OpsDtos;
import com.hostel.management.entity.Booking;
import com.hostel.management.entity.Room;
import com.hostel.management.entity.User;
import com.hostel.management.enums.BookingStatus;
import com.hostel.management.enums.GenderPreference;
import com.hostel.management.enums.NotificationType;
import com.hostel.management.enums.Role;
import com.hostel.management.exception.ApiException;
import com.hostel.management.repository.BookingRepository;
import com.hostel.management.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingService {
    private final BookingRepository bookingRepository;
    private final RoomService roomService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final RentService rentService;

    @Transactional
    public OpsDtos.BookingResponse create(OpsDtos.BookingRequest req) {
        User tenant = currentUserService.requireCurrentUser();
        if (tenant.getRole() != Role.TENANT) {
            throw ApiException.forbidden("Only tenants can book");
        }
        if (tenant.getAadhaarNumber() == null || tenant.getAadhaarNumber().isBlank()) {
            throw ApiException.badRequest("Please enter your 12-digit Aadhaar Number in your Profile before requesting a booking.");
        }
        if (tenant.getAadhaarDocumentUrl() == null || tenant.getAadhaarDocumentUrl().isBlank()) {
            throw ApiException.badRequest("Please upload your Aadhaar card photo/document in your Profile before requesting a booking.");
        }
        Room room = roomService.getEntity(req.getRoomId());
        if (room.getAvailableBeds() <= 0 || !room.isActive()) {
            throw ApiException.badRequest("Room not available");
        }

        GenderPreference hostelGender = room.getHostel().getGenderPreference();
        GenderPreference tenantGender = tenant.getGender();

        if (hostelGender == GenderPreference.MALE) {
            if (tenantGender == GenderPreference.FEMALE) {
                throw ApiException.badRequest("This is a Men's hostel. Female tenants cannot book rooms in this hostel.");
            }
            if (tenantGender != GenderPreference.MALE) {
                throw ApiException.badRequest("This is a Men's hostel. Please set your gender to Male in your profile to book.");
            }
        } else if (hostelGender == GenderPreference.FEMALE) {
            if (tenantGender == GenderPreference.MALE) {
                throw ApiException.badRequest("This is a Women's hostel. Male tenants cannot book rooms in this hostel.");
            }
            if (tenantGender != GenderPreference.FEMALE) {
                throw ApiException.badRequest("This is a Women's hostel. Please set your gender to Female in your profile to book.");
            }
        }
        Booking booking = Booking.builder()
                .tenant(tenant)
                .room(room)
                .status(BookingStatus.PENDING)
                .checkIn(req.getCheckIn() != null ? req.getCheckIn() : LocalDate.now())
                .message(req.getMessage())
                .build();
        bookingRepository.save(booking);
        notificationService.notify(room.getHostel().getOwner(), NotificationType.BOOKING_CONFIRMATION,
                "New booking request",
                tenant.getName() + " requested a bed in " + room.getHostel().getName());
        return Mappers.toBooking(booking);
    }

    public List<OpsDtos.BookingResponse> myBookings() {
        User user = currentUserService.requireCurrentUser();
        if (user.getRole() == Role.OWNER) {
            return bookingRepository.findByRoomHostelOwnerIdOrderByCreatedAtDesc(user.getId())
                    .stream().map(Mappers::toBooking).toList();
        }
        return bookingRepository.findByTenantIdOrderByCreatedAtDesc(user.getId())
                .stream().map(Mappers::toBooking).toList();
    }

    @Transactional
    public OpsDtos.BookingResponse decide(Long id, boolean approve) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Booking not found"));
        User owner = currentUserService.requireCurrentUser();
        if (!booking.getRoom().getHostel().getOwner().getId().equals(owner.getId()) && owner.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Not your booking");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw ApiException.badRequest("Booking already decided");
        }
        if (approve) {
            Room room = booking.getRoom();
            if (room.getAvailableBeds() <= 0) {
                throw ApiException.badRequest("No beds available");
            }
            room.setAvailableBeds(room.getAvailableBeds() - 1);
            booking.setStatus(BookingStatus.ACTIVE);
            rentService.ensureCurrentMonthRent(booking);
            notificationService.notify(booking.getTenant(), NotificationType.BOOKING_CONFIRMATION,
                    "Booking approved",
                    "Your booking at " + room.getHostel().getName() + " was approved.");
        } else {
            booking.setStatus(BookingStatus.REJECTED);
            notificationService.notify(booking.getTenant(), NotificationType.BOOKING_CONFIRMATION,
                    "Booking rejected",
                    "Your booking at " + booking.getRoom().getHostel().getName() + " was rejected.");
        }
        return Mappers.toBooking(bookingRepository.save(booking));
    }

    @Transactional
    public OpsDtos.BookingResponse cancel(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Booking not found"));
        User me = currentUserService.requireCurrentUser();
        boolean isTenant = booking.getTenant().getId().equals(me.getId());
        boolean isOwner = booking.getRoom().getHostel().getOwner().getId().equals(me.getId());
        if (!isTenant && !isOwner && me.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Cannot cancel this booking");
        }
        if (booking.getStatus() == BookingStatus.ACTIVE || booking.getStatus() == BookingStatus.APPROVED) {
            Room room = booking.getRoom();
            room.setAvailableBeds(Math.min(room.getTotalBeds(), room.getAvailableBeds() + 1));
        }
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCheckOut(LocalDate.now());
        return Mappers.toBooking(bookingRepository.save(booking));
    }

    public Booking getEntity(Long id) {
        return bookingRepository.findById(id).orElseThrow(() -> ApiException.notFound("Booking not found"));
    }
}
