package com.hostel.management.controller;

import com.hostel.management.dto.AuthDtos;
import com.hostel.management.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public AuthDtos.AuthResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public AuthDtos.UserResponse me() {
        return authService.me();
    }

    @PutMapping("/profile")
    public AuthDtos.UserResponse updateProfile(@RequestBody AuthDtos.UpdateProfileRequest request) {
        return authService.updateProfile(request);
    }

    @PostMapping("/profile/photo")
    public AuthDtos.UserResponse uploadProfilePhoto(@RequestParam("file") MultipartFile file) {
        return authService.uploadProfileImage(file);
    }

    @PostMapping("/profile/aadhaar")
    public AuthDtos.UserResponse uploadAadhaar(@RequestParam("file") MultipartFile file) {
        return authService.uploadAadhaar(file);
    }
}
