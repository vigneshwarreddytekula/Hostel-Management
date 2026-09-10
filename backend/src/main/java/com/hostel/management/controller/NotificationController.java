package com.hostel.management.controller;

import com.hostel.management.dto.Mappers;
import com.hostel.management.dto.OpsDtos;
import com.hostel.management.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping
    public List<OpsDtos.NotificationResponse> list() {
        return notificationService.myNotifications().stream().map(Mappers::toNotification).toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", notificationService.unreadCount());
    }

    @PostMapping("/{id}/read")
    public OpsDtos.NotificationResponse markRead(@PathVariable Long id) {
        return Mappers.toNotification(notificationService.markRead(id));
    }

    @PostMapping("/read-all")
    public Map<String, String> markAllRead() {
        notificationService.markAllRead();
        return Map.of("message", "All marked as read");
    }
}
