package com.hostel.management.service;

import com.hostel.management.dto.HostelDtos;
import com.hostel.management.dto.Mappers;
import com.hostel.management.entity.Hostel;
import com.hostel.management.entity.Room;
import com.hostel.management.entity.User;
import com.hostel.management.enums.GenderPreference;
import com.hostel.management.enums.Role;
import com.hostel.management.exception.ApiException;
import com.hostel.management.integration.ImageStorageService;
import com.hostel.management.repository.HostelRepository;
import com.hostel.management.repository.RoomRepository;
import com.hostel.management.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HostelService {
    private final HostelRepository hostelRepository;
    private final RoomRepository roomRepository;
    private final CurrentUserService currentUserService;
    private final ImageStorageService imageStorageService;

    public List<HostelDtos.HostelResponse> search(
            String city, String gender, BigDecimal minRent, BigDecimal maxRent,
            String sharingType, Boolean availableOnly, String amenity, Boolean verifiedOnly) {
        GenderPreference gp = null;
        if (gender != null && !gender.isBlank()) {
            gp = GenderPreference.valueOf(gender.toUpperCase());
        }
        boolean avail = availableOnly != null && availableOnly;
        boolean verified = verifiedOnly == null || verifiedOnly;
        List<Hostel> hostels = hostelRepository.search(
                blankToNull(city), verified, gp, minRent, maxRent,
                blankToNull(sharingType), avail, blankToNull(amenity));
        return hostels.stream().map(this::enrich).toList();
    }

    public HostelDtos.HostelResponse getById(Long id) {
        return enrich(find(id));
    }

    public List<HostelDtos.HostelResponse> myHostels() {
        User owner = requireOwner();
        return hostelRepository.findByOwnerId(owner.getId()).stream().map(this::enrich).toList();
    }

    @Transactional
    public HostelDtos.HostelResponse create(HostelDtos.HostelRequest req) {
        User owner = requireOwner();
        Hostel hostel = Hostel.builder()
                .owner(owner)
                .name(req.getName())
                .description(req.getDescription())
                .address(req.getAddress())
                .city(req.getCity())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .genderPreference(req.getGenderPreference() != null ? req.getGenderPreference() : GenderPreference.ANY)
                .amenities(Mappers.joinCsv(req.getAmenities()))
                .verified(false)
                .leaveDeductionEnabled(req.getLeaveDeductionEnabled() == null || req.getLeaveDeductionEnabled())
                .useProrataDeduction(req.getUseProrataDeduction() == null || req.getUseProrataDeduction())
                .fixedDeductionPerDay(req.getFixedDeductionPerDay())
                .build();
        return enrich(hostelRepository.save(hostel));
    }

    @Transactional
    public HostelDtos.HostelResponse update(Long id, HostelDtos.HostelRequest req) {
        Hostel hostel = requireOwnedHostel(id);
        hostel.setName(req.getName());
        hostel.setDescription(req.getDescription());
        hostel.setAddress(req.getAddress());
        hostel.setCity(req.getCity());
        hostel.setLatitude(req.getLatitude());
        hostel.setLongitude(req.getLongitude());
        if (req.getGenderPreference() != null) hostel.setGenderPreference(req.getGenderPreference());
        if (req.getAmenities() != null) hostel.setAmenities(Mappers.joinCsv(req.getAmenities()));
        if (req.getLeaveDeductionEnabled() != null) hostel.setLeaveDeductionEnabled(req.getLeaveDeductionEnabled());
        if (req.getUseProrataDeduction() != null) hostel.setUseProrataDeduction(req.getUseProrataDeduction());
        if (req.getFixedDeductionPerDay() != null) hostel.setFixedDeductionPerDay(req.getFixedDeductionPerDay());
        return enrich(hostelRepository.save(hostel));
    }

    @Transactional
    public void delete(Long id) {
        Hostel hostel = requireOwnedHostel(id);
        List<Room> rooms = roomRepository.findByHostelId(hostel.getId());
        if (!rooms.isEmpty()) {
            roomRepository.deleteAll(rooms);
        }
        hostelRepository.delete(hostel);
    }

    @Transactional
    public HostelDtos.HostelResponse uploadImages(Long id, MultipartFile[] files) {
        Hostel hostel = requireOwnedHostel(id);
        List<String> urls = new ArrayList<>(Mappers.splitCsv(hostel.getImageUrls()));
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                urls.add(imageStorageService.upload(file));
            }
        }
        hostel.setImageUrls(Mappers.joinCsv(urls));
        return enrich(hostelRepository.save(hostel));
    }

    @Transactional
    public HostelDtos.HostelResponse verify(Long id, boolean verified) {
        requireAdmin();
        Hostel hostel = find(id);
        hostel.setVerified(verified);
        return enrich(hostelRepository.save(hostel));
    }

    public List<HostelDtos.HostelResponse> allForAdmin() {
        requireAdmin();
        return hostelRepository.findAll().stream().map(this::enrich).toList();
    }

    private HostelDtos.HostelResponse enrich(Hostel h) {
        List<Room> rooms = roomRepository.findByHostelId(h.getId());
        BigDecimal minRent = rooms.stream()
                .map(Room::getMonthlyRent)
                .min(Comparator.naturalOrder())
                .orElse(null);
        int available = rooms.stream().mapToInt(Room::getAvailableBeds).sum();
        return Mappers.toHostel(h, minRent, available);
    }

    private Hostel find(Long id) {
        return hostelRepository.findById(id).orElseThrow(() -> ApiException.notFound("Hostel not found"));
    }

    private Hostel requireOwnedHostel(Long id) {
        User owner = requireOwner();
        Hostel hostel = find(id);
        if (!hostel.getOwner().getId().equals(owner.getId()) && owner.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Not your hostel");
        }
        return hostel;
    }

    private User requireOwner() {
        User user = currentUserService.requireCurrentUser();
        if (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Owner role required");
        }
        return user;
    }

    private void requireAdmin() {
        if (currentUserService.requireCurrentUser().getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Admin role required");
        }
    }

    private String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
