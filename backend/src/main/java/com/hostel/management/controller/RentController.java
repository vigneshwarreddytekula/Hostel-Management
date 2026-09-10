package com.hostel.management.controller;

import com.hostel.management.dto.OpsDtos;
import com.hostel.management.service.RentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rents")
@RequiredArgsConstructor
public class RentController {
    private final RentService rentService;

    @GetMapping
    public List<OpsDtos.RentResponse> list() {
        return rentService.listMine();
    }

    @PostMapping("/generate")
    public Map<String, String> generate() {
        rentService.generateMonthlyRents();
        return Map.of("message", "Monthly rents generated");
    }

    @PostMapping("/{id}/charges")
    public OpsDtos.RentResponse addCharges(@PathVariable Long id, @Valid @RequestBody OpsDtos.AdditionalChargeRequest request) {
        return rentService.addCharges(id, request.getAmount());
    }
}
