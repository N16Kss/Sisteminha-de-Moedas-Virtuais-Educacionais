package com.example.moedas;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public final class ApiModels {
    private ApiModels() {}

    public record RegistrationRequest(
            @NotBlank String name,
            @NotBlank @Email String email,
            @NotBlank String password,
            @NotBlank String role,
            String cpf,
            String rg,
            String address,
            String institution,
            String course,
            String department,
            String cnpj,
            String responsible,
            String description) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record AwardRequest(@NotBlank String studentId, @Min(1) int amount, @NotBlank String reason) {}
    public record TransferRequest(@NotBlank String receiverId, @Min(1) int amount, @NotBlank String reason) {}
    public record BenefitRequest(
            @NotBlank String title, @NotBlank String company, @NotBlank String description,
            @Min(1) int cost, @NotBlank String category, @NotBlank String image) {}
    public record CouponRequest(@NotBlank String code) {}

    public record UserView(
            String id, String name, String email, String role, String institution,
            String department, String classroom, int balance) {}
    public record LoginResponse(String token, UserView user) {}
    public record TransactionView(
            String id, String title, String description, Instant date, int amount, String kind, String code) {}
    public record BenefitView(
            String id, String title, String company, String description, int cost,
            String category, String image, boolean active) {}
    public record TransferView(
            String id, String senderId, String senderName, String receiverId, String receiverName,
            int amount, String reason, String classroom, List<String> sharedTeachers,
            String status, Instant createdAt) {}
    public record CouponView(String code, String benefit, String company) {}
    public record ValidationView(boolean valid, String message, String benefit, String student) {}
    public record SharedClassroomView(boolean shared, String classroom, List<String> teachers) {}
    public record InstitutionView(String id, String name) {}
    public record PublicStatistics(long recognizedStudents, long distributedCoins) {}

    record Account(
            String id, String name, String email, String passwordHash, String role,
            String institutionId, String institution, String cpf, String rg, String address,
            String course, String department, String cnpj, String responsible,
            String description, int balance) {
        UserView view(String classroom) {
            String institutionName = institution == null && "company".equals(role)
                    ? "Parceiro verificado" : institution;
            return new UserView(id, name, email, role, institutionName,
                    department, classroom, balance);
        }
    }
}
