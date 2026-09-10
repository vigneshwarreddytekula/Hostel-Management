package com.hostel.management.integration;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@Service
public class ImageStorageService {
    @Value("${app.cloudinary.cloud-name:}")
    private String cloudName;
    @Value("${app.cloudinary.api-key:}")
    private String apiKey;
    @Value("${app.cloudinary.api-secret:}")
    private String apiSecret;
    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    private Cloudinary cloudinary;
    private boolean cloudinaryEnabled;

    @PostConstruct
    public void init() throws IOException {
        cloudinaryEnabled = cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
        if (cloudinaryEnabled) {
            cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret
            ));
        }
        Files.createDirectories(Paths.get(uploadDir));
    }

    public String upload(MultipartFile file) {
        try {
            if (cloudinaryEnabled) {
                Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
                return String.valueOf(result.get("secure_url"));
            }
            String filename = UUID.randomUUID() + "-" + file.getOriginalFilename();
            Path target = Paths.get(uploadDir).resolve(filename);
            Files.write(target, file.getBytes());
            return "/uploads/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Image upload failed: " + e.getMessage(), e);
        }
    }

    public boolean isCloudinaryEnabled() {
        return cloudinaryEnabled;
    }
}
