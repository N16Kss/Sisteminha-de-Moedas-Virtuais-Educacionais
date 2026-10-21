package com.example.moedas;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
class AuthService {
    private final MeritDao dao;
    private final PasswordEncoder passwords;
    private final SemesterService semesters;
    private final SecureRandom random = new SecureRandom();

    AuthService(MeritDao dao, PasswordEncoder passwords, SemesterService semesters) {
        this.dao = dao;
        this.passwords = passwords;
        this.semesters = semesters;
    }

    @Transactional
    String register(ApiModels.RegistrationRequest request) {
        String role = request.role().toLowerCase(Locale.ROOT);
        if (!ListRoles.ALLOWED.contains(role)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Perfil inválido.");
        if (request.password().length() < 6) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A senha deve ter pelo menos 6 caracteres.");
        if (dao.emailExists(request.email().trim())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado.");
        String institutionId = null;
        if ("student".equals(role) || "teacher".equals(role)) {
            if (request.institution() == null || request.institution().isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione uma instituição cadastrada.");
            institutionId = dao.findInstitutionId(request.institution().trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Instituição não cadastrada."));
        }
        String userId;
        if ("teacher".equals(role)) {
            requireDocumentLength(request.cpf(), 11, "CPF");
            if (dao.cpfExists(digits(request.cpf())))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Este CPF já está cadastrado.");
            if (request.department() == null || request.department().isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Departamento é obrigatório.");
            String registeredInstitution = dao.registeredTeacherInstitution(request.cpf())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "Professor não pré-cadastrado pela instituição."));
            if (!registeredInstitution.equals(institutionId))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O CPF não está vinculado à instituição selecionada.");
            userId = dao.createRegisteredTeacher(request, passwords.encode(request.password()), institutionId);
            semesters.creditCurrentSemester(userId);
        } else {
            if ("student".equals(role)) {
                requireDocumentLength(request.cpf(), 11, "CPF");
                if (request.rg() == null || request.rg().isBlank()
                        || request.address() == null || request.address().isBlank() || request.course() == null || request.course().isBlank())
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF, RG, endereço e curso são obrigatórios para alunos.");
                if (dao.cpfExists(digits(request.cpf())))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Este CPF já está cadastrado.");
            }
            if ("company".equals(role) && (request.cnpj() == null || request.cnpj().isBlank()
                    || request.responsible() == null || request.responsible().isBlank()
                    || request.description() == null || request.description().isBlank()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CNPJ, responsável e descrição são obrigatórios para empresas.");
            if ("company".equals(role)) {
                requireDocumentLength(request.cnpj(), 14, "CNPJ");
                if (dao.cnpjExists(digits(request.cnpj())))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Este CNPJ já está cadastrado.");
                if (dao.companyExists(request.name().trim()))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta empresa já está cadastrada.");
            }
            userId = dao.createStudentOrCompany(request, passwords.encode(request.password()), institutionId);
        }
        return userId;
    }

    @Transactional
    ApiModels.LoginResponse login(ApiModels.LoginRequest request) {
        ApiModels.Account account = dao.findAccountByEmail(request.email().trim())
                .filter(user -> passwords.matches(request.password(), user.passwordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos."));
        if ("teacher".equals(account.role())) {
            semesters.creditCurrentSemester(account.id());
            account = dao.findAccountById(account.id())
                    .orElseThrow(() -> new IllegalStateException("Conta de professor desapareceu durante o login."));
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        dao.createSession(hashToken(token), account.id());
        return new ApiModels.LoginResponse(token, account.view(semesters.classroom(account.id())));
    }

    String hashToken(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível.", e);
        }
    }

    private static String digits(String value) {
        return value.replaceAll("\\D", "");
    }

    private static void requireDocumentLength(String document, int expectedLength, String label) {
        if (document == null || digits(document).length() != expectedLength)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    label + " deve conter " + expectedLength + " dígitos.");
    }

    private static final class ListRoles {
        private static final java.util.Set<String> ALLOWED = java.util.Set.of("student", "teacher", "company");
    }
}
