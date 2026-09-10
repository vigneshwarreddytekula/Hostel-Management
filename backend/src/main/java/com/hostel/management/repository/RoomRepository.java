package com.hostel.management.repository;

import com.hostel.management.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByHostelId(Long hostelId);
    List<Room> findByHostelIdAndActiveTrue(Long hostelId);

    @Query("SELECT COALESCE(SUM(r.totalBeds), 0) FROM Room r WHERE r.hostel.owner.id = :ownerId")
    long sumTotalBedsByOwner(Long ownerId);

    @Query("SELECT COALESCE(SUM(r.availableBeds), 0) FROM Room r WHERE r.hostel.owner.id = :ownerId")
    long sumAvailableBedsByOwner(Long ownerId);

    @Query("SELECT COALESCE(SUM(r.totalBeds), 0) FROM Room r WHERE r.hostel.id = :hostelId")
    long sumTotalBedsByHostel(Long hostelId);

    @Query("SELECT COALESCE(SUM(r.availableBeds), 0) FROM Room r WHERE r.hostel.id = :hostelId")
    long sumAvailableBedsByHostel(Long hostelId);
}
