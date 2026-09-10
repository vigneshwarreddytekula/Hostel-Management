package com.hostel.management.controller;

import com.hostel.management.dto.OpsDtos;
import com.hostel.management.service.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/leaves")
@RequiredArgsConstructor
public class LeaveController {
    private final LeaveService leaveService;

    @PostMapping
    public OpsDtos.LeaveResponse apply(@Valid @RequestBody OpsDtos.LeaveRequestDto request) {
        return leaveService.apply(request);
    }

    @GetMapping
    public List<OpsDtos.LeaveResponse> list() {
        return leaveService.listMine();
    }

    @PostMapping("/{id}/approve")
    public OpsDtos.LeaveResponse approve(@PathVariable Long id) {
        return leaveService.decide(id, true);
    }

    @PostMapping("/{id}/reject")
    public OpsDtos.LeaveResponse reject(@PathVariable Long id) {
        return leaveService.decide(id, false);
    }
}
