package com.hostel.management.scheduler;

import com.hostel.management.service.RentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RentScheduler {
    private final RentService rentService;

    @Scheduled(cron = "0 0 1 1 * *")
    public void generateMonthlyRents() {
        log.info("Generating monthly rent records");
        rentService.generateMonthlyRents();
    }

    @Scheduled(cron = "0 0 9 * * *")
    public void markOverdue() {
        rentService.markOverdue();
    }
}
