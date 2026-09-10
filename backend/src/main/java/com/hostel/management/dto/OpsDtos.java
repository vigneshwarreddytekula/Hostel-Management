package com.hostel.management.dto;

import com.hostel.management.enums.BookingStatus;
import com.hostel.management.enums.LeaveStatus;
import com.hostel.management.enums.PaymentStatus;
import com.hostel.management.enums.RentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public class OpsDtos {
    @Data
    public static class BookingRequest {
        @NotNull
        private Long roomId;
        private LocalDate checkIn;
        private String message;
    }

    @Data
    public static class BookingResponse {
        private Long id;
        private Long tenantId;
        private String tenantName;
        private Long roomId;
        private Long hostelId;
        private String hostelName;
        private String roomCategory;
        private BookingStatus status;
        private LocalDate checkIn;
        private LocalDate checkOut;
        private String message;
        private Instant createdAt;
    }

    @Data
    public static class LeaveRequestDto {
        @NotNull
        private Long bookingId;
        @NotNull
        private LocalDate startDate;
        @NotNull
        private LocalDate endDate;
        private String reason;
    }

    @Data
    public static class LeaveResponse {
        private Long id;
        private Long bookingId;
        private Long tenantId;
        private String tenantName;
        private LocalDate startDate;
        private LocalDate endDate;
        private String reason;
        private LeaveStatus status;
        private Integer approvedDays;
        private Instant createdAt;
    }

    @Data
    public static class RentResponse {
        private Long id;
        private Long bookingId;
        private String tenantName;
        private String hostelName;
        private int year;
        private int month;
        private BigDecimal baseRent;
        private BigDecimal leaveDeduction;
        private BigDecimal additionalCharges;
        private BigDecimal finalRent;
        private RentStatus status;
        private Instant dueDate;
    }

    @Data
    public static class AdditionalChargeRequest {
        @NotNull
        private BigDecimal amount;
    }

    @Data
    public static class PaymentOrderResponse {
        private Long paymentId;
        private String orderId;
        private BigDecimal amount;
        private String currency;
        private String keyId;
        private boolean mock;
    }

    @Data
    public static class PaymentVerifyRequest {
        @NotNull
        private Long paymentId;
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private String razorpaySignature;
        private boolean mockSuccess;
    }

    @Data
    public static class PaymentResponse {
        private Long id;
        private Long rentRecordId;
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private BigDecimal amount;
        private PaymentStatus status;
        private Instant paidAt;
        private Long receiptId;
        private String receiptNumber;
    }

    @Data
    public static class NotificationResponse {
        private Long id;
        private String type;
        private String title;
        private String body;
        private boolean read;
        private Instant createdAt;
    }

    @Data
    public static class OwnerDashboardResponse {
        private long totalTenants;
        private long occupiedBeds;
        private long vacantBeds;
        private BigDecimal monthlyIncome;
        private long pendingPayments;
        private long overduePayments;
    }

    @Data
    public static class AdminDashboardResponse {
        private long totalUsers;
        private long tenants;
        private long owners;
        private long hostels;
        private long verifiedHostels;
        private long activeBookings;
        private BigDecimal totalRevenue;
    }
}
