package com.hostel.management.dto;

import com.hostel.management.enums.GenderPreference;
import com.hostel.management.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDtos {
    @Data
    public static class RegisterRequest {
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 6)
        private String password;
        @NotBlank
        private String name;
        private String phone;
        private GenderPreference gender;
        @NotNull
        private Role role;
    }

    @Data
    public static class LoginRequest {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String password;
    }

    @Data
    public static class AuthResponse {
        private String token;
        private UserResponse user;
    }

    @Data
    public static class UserResponse {
        private Long id;
        private String email;
        private String name;
        private String phone;
        private GenderPreference gender;
        private Role role;
        private String profileImageUrl;
        private String aadhaarNumber;
        private String aadhaarDocumentUrl;
        private String address;
        private boolean aadhaarUploaded;
        private boolean active;
    }

    @Data
    public static class UpdateProfileRequest {
        private String name;
        private String phone;
        private GenderPreference gender;
        private String address;
        private String aadhaarNumber;
    }
}
