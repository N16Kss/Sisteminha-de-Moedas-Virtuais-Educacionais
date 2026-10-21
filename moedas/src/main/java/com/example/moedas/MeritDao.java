package com.example.moedas;

import java.util.List;
import java.util.Optional;

interface MeritDao {
    Optional<ApiModels.Account> findAccountByEmail(String email);
    Optional<ApiModels.Account> findAccountById(String id);
    boolean teacherHasStudent(String teacherId, String studentId);
    List<ApiModels.Account> findStudents(String institutionId);
    List<String> findTeachers();
    String createStudentOrCompany(ApiModels.RegistrationRequest request, String passwordHash, String institutionId);
    String createRegisteredTeacher(ApiModels.RegistrationRequest request, String passwordHash, String institutionId);
    Optional<String> findInstitutionId(String name);
    List<ApiModels.InstitutionView> institutions();
    ApiModels.PublicStatistics publicStatistics();
    boolean emailExists(String email);
    boolean cpfExists(String cpf);
    boolean cnpjExists(String cnpj);
    boolean companyExists(String name);
    Optional<ApiModels.Account> findCompanyByName(String name);
    void createSession(String tokenHash, String userId);
    Optional<String> findSessionUser(String tokenHash);
    void deleteSession(String tokenHash);
    Optional<String> classroomForStudent(String studentId);
    Optional<String> sharedClassroomId(String firstStudentId, String secondStudentId);
    List<String> sharedTeachers(String firstStudentId, String secondStudentId);
    List<String> sharedTeachers(String firstStudentId, String secondStudentId, String classroomId);
    List<String> classroomTeachers(String studentId);
    String classroomName(String classroomId);
    boolean teacherCanReview(String teacherId, String classroomId);
    List<ApiModels.Account> studentsInClassroom(String teacherId);
    boolean reserveBalance(String userId, int amount);
    void addBalance(String userId, int amount);
    void addTransaction(String userId, String kind, String title, String description, int amount, String code);
    List<ApiModels.TransactionView> transactions(String userId);
    String createTransfer(String senderId, String receiverId, String classroomId, int amount, String reason);
    List<ApiModels.TransferView> transfers(String userId, String role);
    Optional<TransferDetails> transfer(String id);
    boolean updateTransferStatus(String id, String status);
    List<ApiModels.BenefitView> benefits();
    List<ApiModels.BenefitView> companyBenefits(String companyId);
    String createBenefit(String companyId, ApiModels.BenefitRequest request);
    Optional<ApiModels.BenefitView> benefit(String id);
    String createRedemption(String studentId, String benefitId, String companyId, String code);
    Optional<RedemptionDetails> redemptionByCode(String code);
    List<RedemptionDetails> companyRedemptions(String companyId);
    boolean markCouponUsed(String code);
    boolean creditSemester(String teacherId, String semesterKey);
    Optional<String> registeredTeacherInstitution(String cpf);

    record TransferDetails(
            String id, String senderId, String senderName, String receiverId, String receiverName,
            String classroomId, int amount, String reason, String status, java.time.Instant createdAt) {}
    record RedemptionDetails(
            String code, String benefit, String company, String student, String companyId,
            boolean used, java.time.Instant createdAt) {}
}
