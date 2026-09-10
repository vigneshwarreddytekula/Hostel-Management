package com.hostel.management.controller;

import com.hostel.management.dto.OpsDtos;
import com.hostel.management.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @PostMapping("/order/{rentRecordId}")
    public OpsDtos.PaymentOrderResponse createOrder(@PathVariable Long rentRecordId) {
        return paymentService.createOrder(rentRecordId);
    }

    @PostMapping("/verify")
    public OpsDtos.PaymentResponse verify(@Valid @RequestBody OpsDtos.PaymentVerifyRequest request) {
        return paymentService.verify(request);
    }

    @GetMapping
    public List<OpsDtos.PaymentResponse> history() {
        return paymentService.history();
    }

    @GetMapping("/{paymentId}/receipt")
    public ResponseEntity<Resource> downloadReceipt(@PathVariable Long paymentId) {
        Resource resource = paymentService.downloadReceipt(paymentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"receipt-" + paymentId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }
}
