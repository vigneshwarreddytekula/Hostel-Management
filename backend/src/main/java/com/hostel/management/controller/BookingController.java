package com.hostel.management.controller;

import com.hostel.management.dto.OpsDtos;
import com.hostel.management.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {
    private final BookingService bookingService;

    @PostMapping
    public OpsDtos.BookingResponse create(@Valid @RequestBody OpsDtos.BookingRequest request) {
        return bookingService.create(request);
    }

    @GetMapping
    public List<OpsDtos.BookingResponse> list() {
        return bookingService.myBookings();
    }

    @PostMapping("/{id}/approve")
    public OpsDtos.BookingResponse approve(@PathVariable Long id) {
        return bookingService.decide(id, true);
    }

    @PostMapping("/{id}/reject")
    public OpsDtos.BookingResponse reject(@PathVariable Long id) {
        return bookingService.decide(id, false);
    }

    @PostMapping("/{id}/cancel")
    public OpsDtos.BookingResponse cancel(@PathVariable Long id) {
        return bookingService.cancel(id);
    }
}
