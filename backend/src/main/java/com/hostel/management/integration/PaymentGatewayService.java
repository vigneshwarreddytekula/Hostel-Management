package com.hostel.management.integration;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import jakarta.annotation.PostConstruct;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentGatewayService {
    @Value("${app.razorpay.key-id:}")
    private String keyId;
    @Value("${app.razorpay.key-secret:}")
    private String keySecret;

    private RazorpayClient client;
    private boolean enabled;

    @PostConstruct
    public void init() throws RazorpayException {
        enabled = keyId != null && !keyId.isBlank() && keySecret != null && !keySecret.isBlank();
        if (enabled) {
            client = new RazorpayClient(keyId, keySecret);
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getKeyId() {
        return keyId;
    }

    public Map<String, String> createOrder(BigDecimal amountInr, String receipt) {
        if (!enabled) {
            String mockOrderId = "order_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            return Map.of("id", mockOrderId, "currency", "INR", "status", "created");
        }
        try {
            JSONObject options = new JSONObject();
            options.put("amount", amountInr.multiply(BigDecimal.valueOf(100)).longValue());
            options.put("currency", "INR");
            options.put("receipt", receipt);
            Order order = client.orders.create(options);
            return Map.of(
                    "id", order.get("id"),
                    "currency", order.get("currency"),
                    "status", order.get("status")
            );
        } catch (RazorpayException e) {
            throw new RuntimeException("Razorpay order failed: " + e.getMessage(), e);
        }
    }

    public boolean verifySignature(String orderId, String paymentId, String signature) {
        if (!enabled) {
            return true;
        }
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expected = HexFormat.of().formatHex(hash);
            return expected.equals(signature);
        } catch (Exception e) {
            return false;
        }
    }
}
