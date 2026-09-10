package com.hostel.management.controller;

import com.hostel.management.dto.HostelDtos;
import com.hostel.management.service.HostelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/hostels")
@RequiredArgsConstructor
public class HostelController {
    private final HostelService hostelService;

    @GetMapping
    public List<HostelDtos.HostelResponse> search(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) BigDecimal minRent,
            @RequestParam(required = false) BigDecimal maxRent,
            @RequestParam(required = false) String sharingType,
            @RequestParam(required = false) Boolean availableOnly,
            @RequestParam(required = false) String amenity,
            @RequestParam(required = false) Boolean verifiedOnly) {
        return hostelService.search(city, gender, minRent, maxRent, sharingType, availableOnly, amenity, verifiedOnly);
    }

    @GetMapping("/{id}")
    public HostelDtos.HostelResponse get(@PathVariable Long id) {
        return hostelService.getById(id);
    }

    @GetMapping("/mine")
    public List<HostelDtos.HostelResponse> mine() {
        return hostelService.myHostels();
    }

    @PostMapping
    public HostelDtos.HostelResponse create(@Valid @RequestBody HostelDtos.HostelRequest request) {
        return hostelService.create(request);
    }

    @PutMapping("/{id}")
    public HostelDtos.HostelResponse update(@PathVariable Long id, @Valid @RequestBody HostelDtos.HostelRequest request) {
        return hostelService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id) {
        hostelService.delete(id);
        return Map.of("message", "Deleted");
    }

    @PostMapping("/{id}/images")
    public HostelDtos.HostelResponse uploadImages(@PathVariable Long id, @RequestParam("files") MultipartFile[] files) {
        return hostelService.uploadImages(id, files);
    }

    @PatchMapping("/{id}/verify")
    public HostelDtos.HostelResponse verify(@PathVariable Long id, @RequestParam boolean verified) {
        return hostelService.verify(id, verified);
    }
}
