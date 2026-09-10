package com.hostel.management.service;

import com.hostel.management.dto.AuthDtos;
import com.hostel.management.dto.Mappers;
import com.hostel.management.dto.OpsDtos;
import com.hostel.management.entity.User;
import com.hostel.management.enums.BookingStatus;
import com.hostel.management.enums.RentStatus;
import com.hostel.management.enums.Role;
import com.hostel.management.exception.ApiException;
import com.hostel.management.repository.*;
import com.hostel.management.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final CurrentUserService currentUserService;
    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final RentRecordRepository rentRecordRepository;
    private final UserRepository userRepository;
    private final HostelRepository hostelRepository;

    public OpsDtos.OwnerDashboardResponse ownerDashboard() {
        User owner = requireOwnerOrAdmin();
        long vacant = roomRepository.sumAvailableBedsByOwner(owner.getId());
        long total = roomRepository.sumTotalBedsByOwner(owner.getId());
        long occupied = total - vacant;
        YearMonth ym = YearMonth.now();
        BigDecimal income = rentRecordRepository.sumPaidIncomeForOwnerMonth(
                owner.getId(), ym.getYear(), ym.getMonthValue());
        OpsDtos.OwnerDashboardResponse res = new OpsDtos.OwnerDashboardResponse();
        res.setTotalTenants(bookingRepository.countByRoomHostelOwnerIdAndStatusIn(
                owner.getId(), List.of(BookingStatus.ACTIVE, BookingStatus.APPROVED)));
        res.setOccupiedBeds(occupied);
        res.setVacantBeds(vacant);
        res.setMonthlyIncome(income != null ? income : BigDecimal.ZERO);
        res.setPendingPayments(rentRecordRepository.countByOwnerAndStatus(owner.getId(), RentStatus.PENDING));
        res.setOverduePayments(rentRecordRepository.countByOwnerAndStatus(owner.getId(), RentStatus.OVERDUE));
        return res;
    }

    public OpsDtos.AdminDashboardResponse adminDashboard() {
        requireAdmin();
        OpsDtos.AdminDashboardResponse res = new OpsDtos.AdminDashboardResponse();
        res.setTotalUsers(userRepository.count());
        res.setTenants(userRepository.countByRole(Role.TENANT));
        res.setOwners(userRepository.countByRole(Role.OWNER));
        res.setHostels(hostelRepository.count());
        res.setVerifiedHostels(hostelRepository.countByVerifiedTrue());
        res.setActiveBookings(bookingRepository.countByStatus(BookingStatus.ACTIVE));
        BigDecimal revenue = rentRecordRepository.sumAllPaid();
        res.setTotalRevenue(revenue != null ? revenue : BigDecimal.ZERO);
        return res;
    }

    public Map<String, Object> ownerReports() {
        User owner = requireOwnerOrAdmin();
        YearMonth ym = YearMonth.now();
        return Map.of(
                "occupancy", Map.of(
                        "totalBeds", roomRepository.sumTotalBedsByOwner(owner.getId()),
                        "vacantBeds", roomRepository.sumAvailableBedsByOwner(owner.getId())
                ),
                "incomeThisMonth", rentRecordRepository.sumPaidIncomeForOwnerMonth(
                        owner.getId(), ym.getYear(), ym.getMonthValue()),
                "pending", rentRecordRepository.countByOwnerAndStatus(owner.getId(), RentStatus.PENDING),
                "overdue", rentRecordRepository.countByOwnerAndStatus(owner.getId(), RentStatus.OVERDUE)
        );
    }

    public List<AuthDtos.UserResponse> listUsers(Role role) {
        requireAdmin();
        List<User> users = role != null ? userRepository.findByRole(role) : userRepository.findAll();
        return users.stream().map(Mappers::toUser).toList();
    }

    @Transactional
    public AuthDtos.UserResponse setUserActive(Long userId, boolean active) {
        requireAdmin();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (user.getRole() == Role.ADMIN) {
            throw ApiException.badRequest("Cannot disable admin");
        }
        user.setActive(active);
        return Mappers.toUser(userRepository.save(user));
    }

    private User requireOwnerOrAdmin() {
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
}
