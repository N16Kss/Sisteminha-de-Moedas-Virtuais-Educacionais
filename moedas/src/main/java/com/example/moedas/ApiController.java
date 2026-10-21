package com.example.moedas;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
class ApiController {
    private final AuthService auth;
    private final MeritService merit;
    private final MeritDao dao;

    ApiController(AuthService auth, MeritService merit, MeritDao dao) {
        this.auth = auth;
        this.merit = merit;
        this.dao = dao;
    }

    @PostMapping("/auth/register")
    org.springframework.http.ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody ApiModels.RegistrationRequest request) {
        String id = auth.register(request);
        return org.springframework.http.ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id));
    }

    @PostMapping("/auth/login")
    ApiModels.LoginResponse login(@Valid @RequestBody ApiModels.LoginRequest request) {
        return auth.login(request);
    }

    @GetMapping("/institutions")
    List<ApiModels.InstitutionView> institutions() {
        return dao.institutions();
    }

    @GetMapping("/public/statistics")
    ApiModels.PublicStatistics publicStatistics() {
        return dao.publicStatistics();
    }

    @GetMapping("/auth/me")
    ApiModels.UserView me(Authentication authentication) {
        return merit.currentUser(account(authentication));
    }

    @PostMapping("/auth/logout")
    Map<String, Boolean> logout(Authentication authentication) {
        Object token = authentication.getCredentials();
        if (token instanceof String value) dao.deleteSession(auth.hashToken(value));
        return Map.of("success", true);
    }

    @GetMapping("/students/me")
    ApiModels.UserView student(Authentication authentication) {
        return merit.currentUser(account(authentication));
    }

    @GetMapping("/teachers/me")
    ApiModels.UserView teacher(Authentication authentication) {
        return merit.currentUser(account(authentication));
    }

    @GetMapping("/companies/me")
    ApiModels.UserView company(Authentication authentication) {
        return merit.currentUser(account(authentication));
    }

    @GetMapping({"/transactions/me", "/students/me/transactions", "/teachers/me/transactions"})
    List<ApiModels.TransactionView> transactions(Authentication authentication) {
        return merit.transactions(account(authentication));
    }

    @GetMapping("/students")
    List<ApiModels.UserView> students(Authentication authentication) {
        ApiModels.Account user = account(authentication);
        return merit.students(user).stream()
                .filter(student -> !"student".equals(user.role()) || !student.id().equals(user.id()))
                .map(student -> student.view(dao.classroomForStudent(student.id())
                        .map(dao::classroomName).orElse(null))).toList();
    }

    @GetMapping("/students/{id}/shared-classroom")
    ApiModels.SharedClassroomView sharedClassroom(
            Authentication authentication, @PathVariable String id) {
        return merit.sharedClassroom(account(authentication), id);
    }

    @GetMapping("/teachers/me/students")
    List<ApiModels.UserView> teacherStudents(Authentication authentication) {
        return merit.teacherStudents(account(authentication)).stream()
                .map(student -> student.view(dao.classroomForStudent(student.id())
                        .map(dao::classroomName).orElse(null))).toList();
    }

    @PostMapping("/teachers/me/awards")
    Map<String, Boolean> award(Authentication authentication, @Valid @RequestBody ApiModels.AwardRequest request) {
        merit.award(account(authentication), request);
        return Map.of("success", true);
    }

    @GetMapping("/transfers/me")
    List<ApiModels.TransferView> transfers(Authentication authentication) {
        return merit.transfers(account(authentication));
    }

    @PostMapping("/transfers")
    Map<String, Boolean> createTransfer(Authentication authentication,
                                        @Valid @RequestBody ApiModels.TransferRequest request) {
        merit.createTransfer(account(authentication), request);
        return Map.of("success", true);
    }

    @PostMapping("/transfers/{id}/approve")
    Map<String, Boolean> approveTransfer(Authentication authentication, @PathVariable String id) {
        merit.reviewTransfer(account(authentication), id, true);
        return Map.of("success", true);
    }

    @PostMapping("/transfers/{id}/reject")
    Map<String, Boolean> rejectTransfer(Authentication authentication, @PathVariable String id) {
        merit.reviewTransfer(account(authentication), id, false);
        return Map.of("success", true);
    }

    @GetMapping("/benefits")
    List<ApiModels.BenefitView> benefits() {
        return merit.benefits();
    }

    @PostMapping("/benefits/{id}/redeem")
    ApiModels.CouponView redeem(Authentication authentication, @PathVariable String id) {
        return merit.redeem(account(authentication), id);
    }

    @GetMapping("/companies/me/benefits")
    List<ApiModels.BenefitView> companyBenefits(Authentication authentication) {
        return merit.companyBenefits(account(authentication));
    }

    @PostMapping("/companies/me/benefits")
    ApiModels.BenefitView createBenefit(Authentication authentication,
                                         @Valid @RequestBody ApiModels.BenefitRequest request) {
        return merit.createBenefit(account(authentication), request);
    }

    @GetMapping("/companies/me/redemptions")
    List<MeritDao.RedemptionDetails> redemptions(Authentication authentication) {
        return merit.companyRedemptions(account(authentication));
    }

    @PostMapping("/companies/me/redemptions/validate")
    ApiModels.ValidationView validateCoupon(Authentication authentication,
                                            @Valid @RequestBody ApiModels.CouponRequest request) {
        return merit.validateCoupon(account(authentication), request.code());
    }

    private static ApiModels.Account account(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof ApiModels.Account account))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticação necessária.");
        return account;
    }
}
