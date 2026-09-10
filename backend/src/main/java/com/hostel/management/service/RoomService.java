package com.hostel.management.service;

import com.hostel.management.dto.HostelDtos;
import com.hostel.management.dto.Mappers;
import com.hostel.management.entity.Hostel;
import com.hostel.management.entity.Room;
import com.hostel.management.entity.User;
import com.hostel.management.enums.Role;
import com.hostel.management.exception.ApiException;
import com.hostel.management.repository.HostelRepository;
import com.hostel.management.repository.RoomRepository;
import com.hostel.management.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {
    private final RoomRepository roomRepository;
    private final HostelRepository hostelRepository;
    private final CurrentUserService currentUserService;

    public List<HostelDtos.RoomResponse> byHostel(Long hostelId) {
        return roomRepository.findByHostelIdAndActiveTrue(hostelId).stream().map(Mappers::toRoom).toList();
    }

    @Transactional
    public HostelDtos.RoomResponse create(Long hostelId, HostelDtos.RoomRequest req) {
        Hostel hostel = requireOwnedHostel(hostelId);
        Room room = Room.builder()
                .hostel(hostel)
                .category(req.getCategory())
                .sharingType(req.getSharingType() != null ? req.getSharingType() : req.getCategory().name())
                .monthlyRent(req.getMonthlyRent())
                .totalBeds(req.getTotalBeds())
                .availableBeds(req.getTotalBeds())
                .amenities(Mappers.joinCsv(req.getAmenities()))
                .active(true)
                .build();
        return Mappers.toRoom(roomRepository.save(room));
    }

    @Transactional
    public HostelDtos.RoomResponse update(Long roomId, HostelDtos.RoomRequest req) {
        Room room = requireOwnedRoom(roomId);
        int occupied = room.getTotalBeds() - room.getAvailableBeds();
        if (req.getTotalBeds() < occupied) {
            throw ApiException.badRequest("Cannot reduce beds below occupied count (" + occupied + ")");
        }
        room.setCategory(req.getCategory());
        room.setSharingType(req.getSharingType() != null ? req.getSharingType() : req.getCategory().name());
        room.setMonthlyRent(req.getMonthlyRent());
        room.setTotalBeds(req.getTotalBeds());
        room.setAvailableBeds(req.getTotalBeds() - occupied);
        if (req.getAmenities() != null) room.setAmenities(Mappers.joinCsv(req.getAmenities()));
        return Mappers.toRoom(roomRepository.save(room));
    }

    @Transactional
    public void delete(Long roomId) {
        Room room = requireOwnedRoom(roomId);
        if (room.getAvailableBeds() < room.getTotalBeds()) {
            throw ApiException.badRequest("Cannot delete room with active occupants");
        }
        room.setActive(false);
        roomRepository.save(room);
    }

    public Room getEntity(Long id) {
        return roomRepository.findById(id).orElseThrow(() -> ApiException.notFound("Room not found"));
    }

    private Hostel requireOwnedHostel(Long hostelId) {
        User user = currentUserService.requireCurrentUser();
        Hostel hostel = hostelRepository.findById(hostelId)
                .orElseThrow(() -> ApiException.notFound("Hostel not found"));
        if (!hostel.getOwner().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Not your hostel");
        }
        return hostel;
    }

    private Room requireOwnedRoom(Long roomId) {
        Room room = getEntity(roomId);
        User user = currentUserService.requireCurrentUser();
        if (!room.getHostel().getOwner().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Not your room");
        }
        return room;
    }
}
