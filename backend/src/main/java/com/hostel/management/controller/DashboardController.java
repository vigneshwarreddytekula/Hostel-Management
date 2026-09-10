package com.hostel.management.controller;

import com.hostel.management.dto.AuthDtos;
import com.hostel.management.dto.HostelDtos;
import com.hostel.management.dto.OpsDtos;
import com.hostel.management.enums.Role;
import com.hostel.management.service.HostelService;
import com.hostel.management.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DashboardController {
    private final ReportService reportService;
    private final HostelService hostelService;

    @GetMapping("/owner/dashboard")
    public OpsDtos.OwnerDashboardResponse ownerDashboard() {
        return reportService.ownerDashboard();
    }

    @GetMapping("/owner/reports")
    public Map<String, Object> ownerReports() {
        return reportService.ownerReports();
    }

    @GetMapping("/admin/dashboard")
    public OpsDtos.AdminDashboardResponse adminDashboard() {
        return reportService.adminDashboard();
    }

    @GetMapping("/admin/users")
    public List<AuthDtos.UserResponse> users(@RequestParam(required = false) Role role) {
        return reportService.listUsers(role);
    }

    @PatchMapping("/admin/users/{id}/active")
    public AuthDtos.UserResponse setActive(@PathVariable Long id, @RequestParam boolean active) {
        return reportService.setUserActive(id, active);
    }

    @GetMapping("/admin/hostels")
    public List<HostelDtos.HostelResponse> allHostels() {
        return hostelService.allForAdmin();
    }
}
