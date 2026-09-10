package com.hostel.management.service;

import com.hostel.management.dto.AuthDtos;
import com.hostel.management.dto.Mappers;
import com.hostel.management.entity.User;
import com.hostel.management.enums.Role;
import com.hostel.management.exception.ApiException;
import com.hostel.management.integration.ImageStorageService;
import com.hostel.management.repository.UserRepository;
import com.hostel.management.security.CurrentUserService;
import com.hostel.management.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final CurrentUserService currentUserService;
    private final ImageStorageService imageStorageService;

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest req) {
        if (req.getRole() == Role.ADMIN) {
            throw ApiException.forbidden("Cannot self-register as admin");
        }
        if (userRepository.existsByEmail(req.getEmail().toLowerCase())) {
            throw ApiException.conflict("Email already registered");
        }
        User user = User.builder()
                .email(req.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .name(req.getName())
                .phone(req.getPhone())
                .gender(req.getGender())
                .role(req.getRole())
                .active(true)
                .build();
        userRepository.save(user);
        return buildAuth(user);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail().toLowerCase(), req.getPassword()));
        User user = userRepository.findByEmail(req.getEmail().toLowerCase())
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (!user.isActive()) {
            throw ApiException.forbidden("Account is disabled");
        }
        return buildAuth(user);
    }

    public AuthDtos.UserResponse me() {
        return Mappers.toUser(currentUserService.requireCurrentUser());
    }

    @Transactional
    public AuthDtos.UserResponse updateProfile(AuthDtos.UpdateProfileRequest req) {
        User user = currentUserService.requireCurrentUser();
        if (req.getName() != null && !req.getName().isBlank()) user.setName(req.getName().trim());
        if (req.getPhone() != null) user.setPhone(req.getPhone().trim());
        if (req.getGender() != null) user.setGender(req.getGender());
        if (req.getAddress() != null) user.setAddress(req.getAddress().trim());
        if (req.getAadhaarNumber() != null) user.setAadhaarNumber(req.getAadhaarNumber().trim());
        return Mappers.toUser(userRepository.save(user));
    }

    @Transactional
    public AuthDtos.UserResponse uploadProfileImage(MultipartFile file) {
        validateUpload(file);
        User user = currentUserService.requireCurrentUser();
        user.setProfileImageUrl(imageStorageService.upload(file));
        return Mappers.toUser(userRepository.save(user));
    }

    @Transactional
    public AuthDtos.UserResponse uploadAadhaar(MultipartFile file) {
        validateUpload(file);
        User user = currentUserService.requireCurrentUser();
        user.setAadhaarDocumentUrl(imageStorageService.upload(file));
        return Mappers.toUser(userRepository.save(user));
    }

    private void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("File is required");
        }
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        if (!(contentType.startsWith("image/") || contentType.equals("application/pdf"))) {
            throw ApiException.badRequest("Only image or PDF files are allowed");
        }
        if (file.getSize() > 10 * 1024 * 1024L) {
            throw ApiException.badRequest("File must be under 10 MB");
        }
    }

    private AuthDtos.AuthResponse buildAuth(User user) {
        AuthDtos.AuthResponse res = new AuthDtos.AuthResponse();
        res.setToken(jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId()));
        res.setUser(Mappers.toUser(user));
        return res;
    }
}
