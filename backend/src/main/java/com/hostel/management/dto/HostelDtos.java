package com.hostel.management.dto;

import com.hostel.management.enums.GenderPreference;
import com.hostel.management.enums.RoomCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

public class HostelDtos {
    @Data
    public static class HostelRequest {
        @NotBlank
        private String name;
        private String description;
        @NotBlank
        private String address;
        @NotBlank
        private String city;
        private Double latitude;
        private Double longitude;
        private GenderPreference genderPreference;
        private List<String> amenities;
        private Boolean leaveDeductionEnabled;
        private Boolean useProrataDeduction;
        private BigDecimal fixedDeductionPerDay;
    }

    @Data
    public static class HostelResponse {
        private Long id;
        private Long ownerId;
        private String ownerName;
        private String name;
        private String description;
        private String address;
        private String city;
        private Double latitude;
        private Double longitude;
        private GenderPreference genderPreference;
        private List<String> amenities;
        private List<String> imageUrls;
        private boolean verified;
        private boolean leaveDeductionEnabled;
        private boolean useProrataDeduction;
        private BigDecimal fixedDeductionPerDay;
        private BigDecimal minRent;
        private int availableBeds;
    }

    @Data
    public static class RoomRequest {
        @NotNull
        private RoomCategory category;
        private String sharingType;
        @NotNull @Positive
        private BigDecimal monthlyRent;
        @NotNull @Positive
        private Integer totalBeds;
        private List<String> amenities;
    }

    @Data
    public static class RoomResponse {
        private Long id;
        private Long hostelId;
        private String hostelName;
        private RoomCategory category;
        private String sharingType;
        private BigDecimal monthlyRent;
        private int totalBeds;
        private int availableBeds;
        private List<String> amenities;
        private boolean active;
    }
}
