package com.example.moedas;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
class SemesterService {
    private final MeritDao dao;

    SemesterService(MeritDao dao) {
        this.dao = dao;
    }

    @Transactional
    void creditCurrentSemester(String teacherId) {
        dao.creditSemester(teacherId, semesterKey());
    }

    String classroom(String userId) {
        return dao.classroomForStudent(userId).map(dao::classroomName).orElse(null);
    }

    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    void creditAllTeachers() {
        String key = semesterKey();
        dao.findTeachers().forEach(id -> dao.creditSemester(id, key));
    }

    private String semesterKey() {
        LocalDate today = LocalDate.now();
        return today.getYear() + "-" + (today.getMonthValue() <= 6 ? "1" : "2");
    }
}
