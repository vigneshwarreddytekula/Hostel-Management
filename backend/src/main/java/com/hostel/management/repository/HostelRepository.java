package com.hostel.management.repository;

import com.hostel.management.entity.Hostel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface HostelRepository extends JpaRepository<Hostel, Long> {
    List<Hostel> findByOwnerId(Long ownerId);
    List<Hostel> findByVerifiedTrue();
    long countByVerifiedTrue();

    @Query("""
        SELECT DISTINCT h FROM Hostel h JOIN Room r ON r.hostel = h
        WHERE (:city IS NULL OR LOWER(h.city) LIKE LOWER(CONCAT('%', :city, '%')))
        AND (:verifiedOnly = false OR h.verified = true)
        AND (:gender IS NULL OR h.genderPreference = :gender OR h.genderPreference = com.hostel.management.enums.GenderPreference.ANY)
        AND (:minRent IS NULL OR r.monthlyRent >= :minRent)
        AND (:maxRent IS NULL OR r.monthlyRent <= :maxRent)
        AND (:sharingType IS NULL OR LOWER(r.sharingType) LIKE LOWER(CONCAT('%', :sharingType, '%')))
        AND (:availableOnly = false OR r.availableBeds > 0)
        AND (:amenity IS NULL OR LOWER(h.amenities) LIKE LOWER(CONCAT('%', :amenity, '%')))
        AND h.id IS NOT NULL
        """)
    List<Hostel> search(
            @Param("city") String city,
            @Param("verifiedOnly") boolean verifiedOnly,
            @Param("gender") com.hostel.management.enums.GenderPreference gender,
            @Param("minRent") BigDecimal minRent,
            @Param("maxRent") BigDecimal maxRent,
            @Param("sharingType") String sharingType,
            @Param("availableOnly") boolean availableOnly,
            @Param("amenity") String amenity
    );
}
