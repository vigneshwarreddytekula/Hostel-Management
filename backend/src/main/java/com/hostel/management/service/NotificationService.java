package com.hostel.management.service;

import com.hostel.management.entity.Notification;
import com.hostel.management.entity.User;
import com.hostel.management.enums.NotificationType;
import com.hostel.management.exception.ApiException;
import com.hostel.management.repository.NotificationRepository;
import com.hostel.management.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public void notify(User user, NotificationType type, String title, String body) {
        notificationRepository.save(Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .readFlag(false)
                .build());
    }

    public List<Notification> myNotifications() {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(
                currentUserService.requireCurrentUser().getId());
    }

    public long unreadCount() {
        return notificationRepository.countByUserIdAndReadFlagFalse(
                currentUserService.requireCurrentUser().getId());
    }

    @Transactional
    public Notification markRead(Long id) {
        User me = currentUserService.requireCurrentUser();
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Notification not found"));
        if (!n.getUser().getId().equals(me.getId())) {
            throw ApiException.forbidden("Not your notification");
        }
        n.setReadFlag(true);
        return notificationRepository.save(n);
    }

    @Transactional
    public void markAllRead() {
        User me = currentUserService.requireCurrentUser();
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(me.getId());
        list.forEach(n -> n.setReadFlag(true));
        notificationRepository.saveAll(list);
    }
}
