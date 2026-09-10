package com.hostel.management.integration;

import com.hostel.management.entity.*;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class PdfReceiptService {
    @Value("${app.receipt-dir:receipts}")
    private String receiptDir;

    public String generate(Payment payment, Receipt receiptMeta) {
        try {
            Path dir = Paths.get(receiptDir);
            Files.createDirectories(dir);
            String filename = receiptMeta.getReceiptNumber() + ".pdf";
            Path file = dir.resolve(filename);

            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, new FileOutputStream(file.toFile()));
            document.open();

            RentRecord rent = payment.getRentRecord();
            Booking booking = rent.getBooking();
            User tenant = booking.getTenant();
            Hostel hostel = booking.getRoom().getHostel();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font normal = FontFactory.getFont(FontFactory.HELVETICA, 11);

            document.add(new Paragraph("Hostel Rent Receipt", titleFont));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Receipt Number: " + receiptMeta.getReceiptNumber(), labelFont));
            document.add(new Paragraph("Payment Status: " + payment.getStatus(), normal));
            document.add(new Paragraph("Transaction ID: " +
                    (payment.getRazorpayPaymentId() != null ? payment.getRazorpayPaymentId() : "N/A"), normal));
            String paidAt = payment.getPaidAt() != null
                    ? DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
                    .withZone(ZoneId.systemDefault()).format(payment.getPaidAt())
                    : "N/A";
            document.add(new Paragraph("Payment Date: " + paidAt, normal));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Tenant Details", labelFont));
            document.add(new Paragraph("Name: " + tenant.getName(), normal));
            document.add(new Paragraph("Email: " + tenant.getEmail(), normal));
            document.add(new Paragraph("Phone: " + (tenant.getPhone() != null ? tenant.getPhone() : "-"), normal));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Hostel Details", labelFont));
            document.add(new Paragraph("Hostel: " + hostel.getName(), normal));
            document.add(new Paragraph("Address: " + hostel.getAddress() + ", " + hostel.getCity(), normal));
            document.add(new Paragraph("Period: " + rent.getMonth() + "/" + rent.getYear(), normal));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Amount Breakdown", labelFont));
            document.add(new Paragraph("Monthly Rent: ₹" + rent.getBaseRent(), normal));
            document.add(new Paragraph("Leave Deduction: ₹" + rent.getLeaveDeduction(), normal));
            document.add(new Paragraph("Additional Charges: ₹" + rent.getAdditionalCharges(), normal));
            document.add(new Paragraph("Final Rent Paid: ₹" + payment.getAmount(), labelFont));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Thank you for your payment.", normal));
            document.close();

            return file.toAbsolutePath().toString();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }
}
