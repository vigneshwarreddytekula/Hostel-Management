package com.hostel.management.service;

import com.hostel.management.dto.Mappers;
import com.hostel.management.dto.OpsDtos;
import com.hostel.management.entity.Payment;
import com.hostel.management.entity.Receipt;
import com.hostel.management.entity.RentRecord;
import com.hostel.management.entity.User;
import com.hostel.management.enums.NotificationType;
import com.hostel.management.enums.PaymentStatus;
import com.hostel.management.enums.RentStatus;
import com.hostel.management.enums.Role;
import com.hostel.management.exception.ApiException;
import com.hostel.management.integration.PaymentGatewayService;
import com.hostel.management.integration.PdfReceiptService;
import com.hostel.management.repository.PaymentRepository;
import com.hostel.management.repository.ReceiptRepository;
import com.hostel.management.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final ReceiptRepository receiptRepository;
    private final RentService rentService;
    private final PaymentGatewayService paymentGatewayService;
    private final PdfReceiptService pdfReceiptService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    @Transactional
    public OpsDtos.PaymentOrderResponse createOrder(Long rentRecordId) {
        User tenant = currentUserService.requireCurrentUser();
        RentRecord rent = rentService.getEntity(rentRecordId);
        if (!rent.getBooking().getTenant().getId().equals(tenant.getId()) && tenant.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Not your rent bill");
        }
        if (rent.getStatus() == RentStatus.PAID) {
            throw ApiException.badRequest("Rent already paid");
        }
        Map<String, String> order = paymentGatewayService.createOrder(
                rent.getFinalRent(), "rent-" + rent.getId());
        Payment payment = Payment.builder()
                .rentRecord(rent)
                .razorpayOrderId(order.get("id"))
                .amount(rent.getFinalRent())
                .status(PaymentStatus.CREATED)
                .build();
        paymentRepository.save(payment);

        OpsDtos.PaymentOrderResponse res = new OpsDtos.PaymentOrderResponse();
        res.setPaymentId(payment.getId());
        res.setOrderId(payment.getRazorpayOrderId());
        res.setAmount(payment.getAmount());
        res.setCurrency("INR");
        res.setKeyId(paymentGatewayService.getKeyId());
        res.setMock(!paymentGatewayService.isEnabled());
        return res;
    }

    @Transactional
    public OpsDtos.PaymentResponse verify(OpsDtos.PaymentVerifyRequest req) {
        Payment payment = paymentRepository.findById(req.getPaymentId())
                .orElseThrow(() -> ApiException.notFound("Payment not found"));
        User tenant = currentUserService.requireCurrentUser();
        if (!payment.getRentRecord().getBooking().getTenant().getId().equals(tenant.getId())
                && tenant.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Not your payment");
        }

        boolean ok;
        if (!paymentGatewayService.isEnabled() && req.isMockSuccess()) {
            ok = true;
            payment.setRazorpayPaymentId("pay_mock_" + UUID.randomUUID().toString().substring(0, 12));
            payment.setRazorpaySignature("mock_signature");
        } else {
            ok = paymentGatewayService.verifySignature(
                    req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature());
            payment.setRazorpayPaymentId(req.getRazorpayPaymentId());
            payment.setRazorpaySignature(req.getRazorpaySignature());
        }

        if (!ok) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.getRentRecord().setStatus(RentStatus.FAILED);
            paymentRepository.save(payment);
            throw ApiException.badRequest("Payment verification failed");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(Instant.now());
        payment.getRentRecord().setStatus(RentStatus.PAID);
        paymentRepository.save(payment);

        String receiptNumber = "RCP-" + Instant.now().toEpochMilli();
        Receipt receipt = Receipt.builder()
                .payment(payment)
                .receiptNumber(receiptNumber)
                .build();
        receiptRepository.save(receipt);
        String path = pdfReceiptService.generate(payment, receipt);
        receipt.setFilePath(path);
        receiptRepository.save(receipt);

        notificationService.notify(tenant, NotificationType.PAYMENT_SUCCESS,
                "Payment successful",
                "Paid ₹" + payment.getAmount() + ". Receipt " + receiptNumber);
        notificationService.notify(payment.getRentRecord().getBooking().getRoom().getHostel().getOwner(),
                NotificationType.PAYMENT_SUCCESS,
                "Rent received",
                tenant.getName() + " paid ₹" + payment.getAmount());
        notificationService.notify(tenant, NotificationType.RECEIPT_GENERATED,
                "Receipt ready",
                "Download receipt " + receiptNumber);

        return Mappers.toPayment(payment, receipt);
    }

    public List<OpsDtos.PaymentResponse> history() {
        User user = currentUserService.requireCurrentUser();
        List<Payment> payments = user.getRole() == Role.OWNER || user.getRole() == Role.ADMIN
                ? paymentRepository.findByRentRecordBookingRoomHostelOwnerIdOrderByCreatedAtDesc(user.getId())
                : paymentRepository.findByRentRecordBookingTenantIdOrderByCreatedAtDesc(user.getId());
        return payments.stream()
                .map(p -> Mappers.toPayment(p, receiptRepository.findByPaymentId(p.getId()).orElse(null)))
                .toList();
    }

    public Resource downloadReceipt(Long paymentId) {
        User me = currentUserService.requireCurrentUser();
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> ApiException.notFound("Payment not found"));
        Long tenantId = payment.getRentRecord().getBooking().getTenant().getId();
        Long ownerId = payment.getRentRecord().getBooking().getRoom().getHostel().getOwner().getId();
        if (!me.getId().equals(tenantId) && !me.getId().equals(ownerId) && me.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Cannot download this receipt");
        }
        Receipt receipt = receiptRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> ApiException.notFound("Receipt not found"));
        return new FileSystemResource(receipt.getFilePath());
    }
}
