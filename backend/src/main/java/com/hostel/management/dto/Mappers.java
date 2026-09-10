package com.hostel.management.dto;

import com.hostel.management.entity.*;
import com.hostel.management.enums.BookingStatus;
import com.hostel.management.enums.RoomCategory;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public final class Mappers {
    private Mappers() {}

    public static AuthDtos.UserResponse toUser(User u) {
        AuthDtos.UserResponse r = new AuthDtos.UserResponse();
        r.setId(u.getId());
        r.setEmail(u.getEmail());
        r.setName(u.getName());
        r.setPhone(u.getPhone());
        r.setGender(u.getGender());
        r.setRole(u.getRole());
        r.setProfileImageUrl(u.getProfileImageUrl());
        r.setAadhaarNumber(u.getAadhaarNumber());
        r.setAadhaarDocumentUrl(u.getAadhaarDocumentUrl());
        r.setAddress(u.getAddress());
        r.setAadhaarUploaded(u.getAadhaarDocumentUrl() != null && !u.getAadhaarDocumentUrl().isBlank());
        r.setActive(u.isActive());
        return r;
    }

    public static List<String> splitCsv(String csv) {
        if (csv == null || csv.isBlank()) return Collections.emptyList();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    public static String joinCsv(List<String> list) {
        if (list == null || list.isEmpty()) return "";
        return String.join(",", list);
    }

    public static HostelDtos.HostelResponse toHostel(Hostel h, BigDecimal minRent, int availableBeds) {
        HostelDtos.HostelResponse r = new HostelDtos.HostelResponse();
        r.setId(h.getId());
        r.setOwnerId(h.getOwner().getId());
        r.setOwnerName(h.getOwner().getName());
        r.setName(h.getName());
        r.setDescription(h.getDescription());
        r.setAddress(h.getAddress());
        r.setCity(h.getCity());
        r.setLatitude(h.getLatitude());
        r.setLongitude(h.getLongitude());
        r.setGenderPreference(h.getGenderPreference());
        r.setAmenities(splitCsv(h.getAmenities()));
        r.setImageUrls(splitCsv(h.getImageUrls()));
        r.setVerified(h.isVerified());
        r.setLeaveDeductionEnabled(h.isLeaveDeductionEnabled());
        r.setUseProrataDeduction(h.isUseProrataDeduction());
        r.setFixedDeductionPerDay(h.getFixedDeductionPerDay());
        r.setMinRent(minRent);
        r.setAvailableBeds(availableBeds);
        return r;
    }

    public static HostelDtos.RoomResponse toRoom(Room room) {
        HostelDtos.RoomResponse r = new HostelDtos.RoomResponse();
        r.setId(room.getId());
        r.setHostelId(room.getHostel().getId());
        r.setHostelName(room.getHostel().getName());
        r.setCategory(room.getCategory());
        r.setSharingType(room.getSharingType());
        r.setMonthlyRent(room.getMonthlyRent());
        r.setTotalBeds(room.getTotalBeds());
        r.setAvailableBeds(room.getAvailableBeds());
        r.setAmenities(splitCsv(room.getAmenities()));
        r.setActive(room.isActive());
        return r;
    }

    public static OpsDtos.BookingResponse toBooking(Booking b) {
        OpsDtos.BookingResponse r = new OpsDtos.BookingResponse();
        r.setId(b.getId());
        r.setTenantId(b.getTenant().getId());
        r.setTenantName(b.getTenant().getName());
        r.setRoomId(b.getRoom().getId());
        r.setHostelId(b.getRoom().getHostel().getId());
        r.setHostelName(b.getRoom().getHostel().getName());
        RoomCategory cat = b.getRoom().getCategory();
        r.setRoomCategory(cat != null ? cat.name() : null);
        r.setStatus(b.getStatus());
        r.setCheckIn(b.getCheckIn());
        r.setCheckOut(b.getCheckOut());
        r.setMessage(b.getMessage());
        r.setCreatedAt(b.getCreatedAt());
        return r;
    }

    public static OpsDtos.LeaveResponse toLeave(LeaveRequest l) {
        OpsDtos.LeaveResponse r = new OpsDtos.LeaveResponse();
        r.setId(l.getId());
        r.setBookingId(l.getBooking().getId());
        r.setTenantId(l.getTenant().getId());
        r.setTenantName(l.getTenant().getName());
        r.setStartDate(l.getStartDate());
        r.setEndDate(l.getEndDate());
        r.setReason(l.getReason());
        r.setStatus(l.getStatus());
        r.setApprovedDays(l.getApprovedDays());
        r.setCreatedAt(l.getCreatedAt());
        return r;
    }

    public static OpsDtos.RentResponse toRent(RentRecord rr) {
        OpsDtos.RentResponse r = new OpsDtos.RentResponse();
        r.setId(rr.getId());
        r.setBookingId(rr.getBooking().getId());
        r.setTenantName(rr.getBooking().getTenant().getName());
        r.setHostelName(rr.getBooking().getRoom().getHostel().getName());
        r.setYear(rr.getYear());
        r.setMonth(rr.getMonth());
        r.setBaseRent(rr.getBaseRent());
        r.setLeaveDeduction(rr.getLeaveDeduction());
        r.setAdditionalCharges(rr.getAdditionalCharges());
        r.setFinalRent(rr.getFinalRent());
        r.setStatus(rr.getStatus());
        r.setDueDate(rr.getDueDate());
        return r;
    }

    public static OpsDtos.PaymentResponse toPayment(Payment p, Receipt receipt) {
        OpsDtos.PaymentResponse r = new OpsDtos.PaymentResponse();
        r.setId(p.getId());
        r.setRentRecordId(p.getRentRecord().getId());
        r.setRazorpayOrderId(p.getRazorpayOrderId());
        r.setRazorpayPaymentId(p.getRazorpayPaymentId());
        r.setAmount(p.getAmount());
        r.setStatus(p.getStatus());
        r.setPaidAt(p.getPaidAt());
        if (receipt != null) {
            r.setReceiptId(receipt.getId());
            r.setReceiptNumber(receipt.getReceiptNumber());
        }
        return r;
    }

    public static OpsDtos.NotificationResponse toNotification(Notification n) {
        OpsDtos.NotificationResponse r = new OpsDtos.NotificationResponse();
        r.setId(n.getId());
        r.setType(n.getType().name());
        r.setTitle(n.getTitle());
        r.setBody(n.getBody());
        r.setRead(n.isReadFlag());
        r.setCreatedAt(n.getCreatedAt());
        return r;
    }

    public static boolean isActiveBooking(BookingStatus status) {
        return status == BookingStatus.ACTIVE || status == BookingStatus.APPROVED;
    }
}
