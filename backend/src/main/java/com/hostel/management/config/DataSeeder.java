package com.hostel.management.config;

import com.hostel.management.entity.Hostel;
import com.hostel.management.entity.Room;
import com.hostel.management.entity.User;
import com.hostel.management.enums.GenderPreference;
import com.hostel.management.enums.Role;
import com.hostel.management.enums.RoomCategory;
import com.hostel.management.repository.HostelRepository;
import com.hostel.management.repository.RoomRepository;
import com.hostel.management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final HostelRepository hostelRepository;
    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }
        log.info("Seeding demo data...");

        User admin = userRepository.save(User.builder()
                .email("admin@hostel.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .name("Platform Admin")
                .role(Role.ADMIN)
                .active(true)
                .build());

        User owner = userRepository.save(User.builder()
                .email("owner@hostel.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .name("Rajesh Owner")
                .phone("9876543210")
                .role(Role.OWNER)
                .active(true)
                .build());

        userRepository.save(User.builder()
                .email("tenant@hostel.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .name("Anita Tenant")
                .phone("9123456780")
                .gender(GenderPreference.FEMALE)
                .role(Role.TENANT)
                .aadhaarNumber("123456789012")
                .aadhaarDocumentUrl("/uploads/sample_aadhaar.pdf")
                .active(true)
                .build());

        userRepository.save(User.builder()
                .email("maletenant@hostel.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .name("Rahul Tenant")
                .phone("9876501234")
                .gender(GenderPreference.MALE)
                .role(Role.TENANT)
                .aadhaarNumber("987654321098")
                .aadhaarDocumentUrl("/uploads/sample_aadhaar.pdf")
                .active(true)
                .build());

        Hostel h1 = hostelRepository.save(Hostel.builder()
                .owner(owner)
                .name("Green Valley Girls Hostel")
                .description("Safe, well-connected hostel near colleges with Wi-Fi, meals, and study rooms.")
                .address("12 College Road")
                .city("Chennai")
                .latitude(13.0827)
                .longitude(80.2707)
                .genderPreference(GenderPreference.FEMALE)
                .amenities("WiFi,Meals,Laundry,CCTV,Study Room")
                .imageUrls("")
                .verified(true)
                .leaveDeductionEnabled(true)
                .useProrataDeduction(true)
                .build());

        Hostel h2 = hostelRepository.save(Hostel.builder()
                .owner(owner)
                .name("Campus Nest Boys PG")
                .description("Affordable shared rooms with AC options and 24/7 security.")
                .address("45 Tech Park Avenue")
                .city("Bengaluru")
                .latitude(12.9716)
                .longitude(77.5946)
                .genderPreference(GenderPreference.MALE)
                .amenities("WiFi,AC,Parking,Power Backup,Gym")
                .imageUrls("")
                .verified(true)
                .leaveDeductionEnabled(true)
                .useProrataDeduction(true)
                .build());

        roomRepository.saveAll(List.of(
                Room.builder().hostel(h1).category(RoomCategory.DOUBLE).sharingType("2-sharing")
                        .monthlyRent(new BigDecimal("8500")).totalBeds(10).availableBeds(8)
                        .amenities("Attached Bath,Cupboard").active(true).build(),
                Room.builder().hostel(h1).category(RoomCategory.TRIPLE).sharingType("3-sharing")
                        .monthlyRent(new BigDecimal("6500")).totalBeds(12).availableBeds(10)
                        .amenities("Shared Bath").active(true).build(),
                Room.builder().hostel(h2).category(RoomCategory.SINGLE).sharingType("Single")
                        .monthlyRent(new BigDecimal("12000")).totalBeds(6).availableBeds(5)
                        .amenities("AC,Attached Bath").active(true).build(),
                Room.builder().hostel(h2).category(RoomCategory.DOUBLE).sharingType("2-sharing")
                        .monthlyRent(new BigDecimal("9000")).totalBeds(16).availableBeds(14)
                        .amenities("Fan,Shared Bath").active(true).build()
        ));

        log.info("Seeded admin={}, owner={}, tenant demo accounts (password123)", admin.getEmail(), owner.getEmail());
    }
}
