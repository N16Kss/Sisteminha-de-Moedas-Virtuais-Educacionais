package com.example.moedas;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
class MeritService {
    private final MeritDao dao;
    private final NotificationService notifications;
    private final SecureRandom random = new SecureRandom();

    MeritService(MeritDao dao, NotificationService notifications) {
        this.dao = dao;
        this.notifications = notifications;
    }

    ApiModels.UserView currentUser(ApiModels.Account account) {
        return account.view(dao.classroomForStudent(account.id()).map(dao::classroomName).orElse(null));
    }

    List<ApiModels.TransactionView> transactions(ApiModels.Account account) {
        return dao.transactions(account.id());
    }

    List<ApiModels.Account> students(ApiModels.Account account) {
        if ("teacher".equals(account.role())) return dao.studentsInClassroom(account.id());
        if (!"student".equals(account.role()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este perfil não pode consultar alunos.");
        return dao.findStudents(account.institutionId());
    }

    List<ApiModels.Account> teacherStudents(ApiModels.Account account) {
        requireRole(account, "teacher");
        return dao.studentsInClassroom(account.id());
    }

    ApiModels.SharedClassroomView sharedClassroom(ApiModels.Account current, String otherStudentId) {
        requireRole(current, "student");
        ApiModels.Account other = account(otherStudentId);
        requireRole(other, "student");
        String classroomId = dao.sharedClassroomId(current.id(), other.id()).orElse(null);
        List<String> teachers = classroomId == null ? List.of()
                : dao.sharedTeachers(current.id(), other.id(), classroomId);
        String classroom = classroomId == null ? "" : dao.classroomName(classroomId);
        return new ApiModels.SharedClassroomView(!teachers.isEmpty(), classroom, teachers);
    }

    @Transactional
    void award(ApiModels.Account teacher, ApiModels.AwardRequest request) {
        requireRole(teacher, "teacher");
        ApiModels.Account student = account(request.studentId());
        requireRole(student, "student");
        if (!dao.teacherHasStudent(teacher.id(), student.id()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "O aluno não está vinculado a uma turma do professor.");
        if (request.reason().isBlank()) throw badRequest("O motivo do reconhecimento é obrigatório.");
        if (!dao.reserveBalance(teacher.id(), request.amount()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Saldo insuficiente para enviar as moedas.");
        dao.addBalance(student.id(), request.amount());
        dao.addTransaction(teacher.id(), "award", "Reconhecimento · " + student.name(),
                request.reason().trim(), -request.amount(), null);
        dao.addTransaction(student.id(), "received", "Reconhecimento em aula",
                request.reason().trim(), request.amount(), null);
        notifications.send(student.email(), "Você recebeu moedas de mérito",
                "Olá, " + student.name() + "!\n\n" + teacher.name() + " enviou " + request.amount()
                        + " moedas para você.\nMotivo: " + request.reason().trim());
    }

    @Transactional
    void createTransfer(ApiModels.Account sender, ApiModels.TransferRequest request) {
        requireRole(sender, "student");
        ApiModels.Account receiver = account(request.receiverId());
        requireRole(receiver, "student");
        if (sender.id().equals(receiver.id())) throw badRequest("Você não pode transferir moedas para si mesmo.");
        if (request.reason().isBlank()) throw badRequest("O motivo da transferência é obrigatório.");
        String classroomId = dao.sharedClassroomId(sender.id(), receiver.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "A transferência exige ao menos um professor em comum na mesma turma."));
        if (!dao.reserveBalance(sender.id(), request.amount()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Saldo insuficiente para transferir esse valor.");
        dao.createTransfer(sender.id(), receiver.id(), classroomId, request.amount(), request.reason());
        dao.addTransaction(sender.id(), "sent", "Transferência enviada · " + receiver.name(),
                request.reason().trim(), -request.amount(), null);
    }

    @Transactional
    void reviewTransfer(ApiModels.Account teacher, String transferId, boolean approve) {
        requireRole(teacher, "teacher");
        MeritDao.TransferDetails transfer = dao.transfer(transferId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));
        if (!dao.teacherCanReview(teacher.id(), transfer.classroomId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não é professor desta turma.");
        String status = approve ? "approved" : "rejected";
        if (!dao.updateTransferStatus(transferId, status))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta solicitação não está mais pendente.");
        if (approve) {
            dao.addBalance(transfer.receiverId(), transfer.amount());
            dao.addTransaction(transfer.receiverId(), "received", "Transferência de " + transfer.senderName(),
                    transfer.reason(), transfer.amount(), null);
        } else {
            dao.addBalance(transfer.senderId(), transfer.amount());
            dao.addTransaction(transfer.senderId(), "received", "Transferência devolvida",
                    "Solicitação recusada por " + teacher.name() + ": " + transfer.reason(),
                    transfer.amount(), null);
        }
    }

    @Transactional
    ApiModels.CouponView redeem(ApiModels.Account student, String benefitId) {
        requireRole(student, "student");
        ApiModels.BenefitView benefit = dao.benefit(benefitId)
                .filter(ApiModels.BenefitView::active)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vantagem não encontrada ou indisponível."));
        ApiModels.Account company = accountByCompanyName(benefit.company());
        if (!dao.reserveBalance(student.id(), benefit.cost()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seu saldo não é suficiente para resgatar esta vantagem.");
        String code = couponCode();
        dao.createRedemption(student.id(), benefitId, company.id(), code);
        dao.addTransaction(student.id(), "redemption", benefit.title(),
                "Resgate de vantagem · " + benefit.company(), -benefit.cost(), code);
        notifications.send(student.email(), "Seu cupom de mérito",
                "Olá, " + student.name() + "!\n\nSeu resgate de \"" + benefit.title()
                        + "\" foi confirmado.\nCódigo do cupom: " + code
                        + "\nApresente este código presencialmente ao parceiro.");
        notifications.send(company.email(), "Novo resgate de vantagem",
                student.name() + " resgatou \"" + benefit.title() + "\".\nCódigo para conferência: " + code);
        return new ApiModels.CouponView(code, benefit.title(), benefit.company());
    }

    List<ApiModels.BenefitView> benefits() {
        return dao.benefits();
    }

    List<ApiModels.BenefitView> companyBenefits(ApiModels.Account company) {
        requireRole(company, "company");
        return dao.companyBenefits(company.id());
    }

    @Transactional
    ApiModels.BenefitView createBenefit(ApiModels.Account company, ApiModels.BenefitRequest request) {
        requireRole(company, "company");
        if (!company.name().equalsIgnoreCase(request.company().trim()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O nome da empresa deve corresponder à conta autenticada.");
        if (request.image().isBlank()) throw badRequest("A foto ou URL da imagem é obrigatória.");
        String id = dao.createBenefit(company.id(), request);
        return dao.benefit(id).orElseThrow(() -> new IllegalStateException("Vantagem persistida não foi localizada."));
    }

    List<MeritDao.RedemptionDetails> companyRedemptions(ApiModels.Account company) {
        requireRole(company, "company");
        return dao.companyRedemptions(company.id());
    }

    @Transactional
    ApiModels.ValidationView validateCoupon(ApiModels.Account company, String code) {
        requireRole(company, "company");
        MeritDao.RedemptionDetails redemption = dao.redemptionByCode(code.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Código de cupom não reconhecido."));
        if (!redemption.companyId().equals(company.id()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este cupom pertence a outro parceiro.");
        if (redemption.used()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Este cupom já foi utilizado.");
        if (!dao.markCouponUsed(redemption.code()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este cupom já foi utilizado.");
        return new ApiModels.ValidationView(true, "Cupom validado com sucesso.", redemption.benefit(), redemption.student());
    }

    List<ApiModels.TransferView> transfers(ApiModels.Account account) {
        return dao.transfers(account.id(), account.role());
    }

    private ApiModels.Account account(String id) {
        return dao.findAccountById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conta não encontrada."));
    }

    private ApiModels.Account accountByCompanyName(String name) {
        return dao.findCompanyByName(name)
                .orElseThrow(() -> new IllegalStateException("Empresa da vantagem não foi localizada."));
    }

    private static void requireRole(ApiModels.Account user, String role) {
        if (!role.equals(user.role()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta operação não está disponível para seu perfil.");
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private String couponCode() {
        byte[] bytes = new byte[4];
        random.nextBytes(bytes);
        String value = HexFormat.of().withUpperCase().formatHex(bytes);
        return "MR-" + value.substring(0, 4) + "-" + value.substring(4);
    }
}
