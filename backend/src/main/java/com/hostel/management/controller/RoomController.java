package com.hostel.management.controller;

import com.hostel.management.dto.HostelDtos;
import com.hostel.management.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {
    private final RoomService roomService;

    @GetMapping("/hostel/{hostelId}")
    public List<HostelDtos.RoomResponse> byHostel(@PathVariable Long hostelId) {
        return roomService.byHostel(hostelId);
    }

    @PostMapping("/hostel/{hostelId}")
    public HostelDtos.RoomResponse create(@PathVariable Long hostelId, @Valid @RequestBody HostelDtos.RoomRequest request) {
        return roomService.create(hostelId, request);
    }

    @PutMapping("/{id}")
    public HostelDtos.RoomResponse update(@PathVariable Long id, @Valid @RequestBody HostelDtos.RoomRequest request) {
        return roomService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id) {
        roomService.delete(id);
        return Map.of("message", "Deleted");
    }
}
