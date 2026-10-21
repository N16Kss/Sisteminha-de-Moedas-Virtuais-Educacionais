package com.example.moedas;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class JdbcMeritDao implements MeritDao {
    private final JdbcTemplate jdbc;

    JdbcMeritDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<ApiModels.Account> ACCOUNT = (rs, row) -> new ApiModels.Account(
            rs.getString("id"), rs.getString("name"), rs.getString("email"),
            rs.getString("password_hash"), rs.getString("role"), rs.getString("institution_id"),
            rs.getString("institution"), rs.getString("cpf"), rs.getString("rg"),
            rs.getString("address"), rs.getString("course"), rs.getString("department"),
            rs.getString("cnpj"), rs.getString("responsible"), rs.getString("description"),
            rs.getInt("balance"));

    private static final String ACCOUNT_SELECT = """
            SELECT u.id,u.name,u.email,u.password_hash,u.role,u.institution_id,
                   i.name AS institution,u.cpf,u.rg,u.address,u.course,u.department,
                   u.cnpj,u.responsible,u.description,u.balance
            FROM users u LEFT JOIN institutions i ON i.id=u.institution_id
            """;

    @Override public Optional<ApiModels.Account> findAccountByEmail(String email) {
        return queryAccount("WHERE LOWER(u.email)=LOWER(?)", email);
    }
    @Override public Optional<ApiModels.Account> findAccountById(String id) {
        return queryAccount("WHERE u.id=?", id);
    }
    private Optional<ApiModels.Account> queryAccount(String predicate, String value) {
        List<ApiModels.Account> rows = jdbc.query(ACCOUNT_SELECT + " " + predicate, ACCOUNT, value);
        return rows.stream().findFirst();
    }
    @Override public boolean teacherHasStudent(String teacherId, String studentId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(
                    SELECT 1 FROM classroom_students cs
                    JOIN classroom_teachers ct ON ct.classroom_id=cs.classroom_id
                    WHERE cs.student_id=? AND ct.teacher_id=?
                )
                """, Boolean.class, studentId, teacherId));
    }
    @Override public List<ApiModels.Account> findStudents(String institutionId) {
        return jdbc.query(ACCOUNT_SELECT + " WHERE u.role='student' AND u.institution_id=? ORDER BY u.name",
                ACCOUNT, institutionId);
    }
    @Override public List<String> findTeachers() {
        return jdbc.query("SELECT id FROM users WHERE role='teacher'", (rs, row) -> rs.getString(1));
    }
    @Override public Optional<String> findInstitutionId(String name) {
        return jdbc.query("SELECT id FROM institutions WHERE LOWER(name)=LOWER(?)", (rs, row) -> rs.getString(1), name)
                .stream().findFirst();
    }
    @Override public List<ApiModels.InstitutionView> institutions() {
        return jdbc.query("SELECT id,name FROM institutions ORDER BY name",
                (rs, row) -> new ApiModels.InstitutionView(rs.getString("id"), rs.getString("name")));
    }
    @Override public ApiModels.PublicStatistics publicStatistics() {
        long recognized = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT t.user_id) FROM transactions t
                JOIN users u ON u.id=t.user_id
                WHERE u.role='student' AND t.kind='received' AND t.amount>0
                """, Long.class);
        long distributed = jdbc.queryForObject("""
                SELECT COALESCE(SUM(ABS(amount)),0) FROM transactions WHERE kind='award'
                """, Long.class);
        return new ApiModels.PublicStatistics(recognized, distributed);
    }
    @Override public boolean emailExists(String email) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email)=LOWER(?))",
                Boolean.class, email));
    }
    @Override public boolean cpfExists(String cpf) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE cpf=?)", Boolean.class, cpf));
    }
    @Override public boolean cnpjExists(String cnpj) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM users WHERE cnpj=?)", Boolean.class, cnpj));
    }
    @Override public boolean companyExists(String name) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM users WHERE role='company' AND LOWER(name)=LOWER(?))", Boolean.class, name));
    }
    @Override public Optional<ApiModels.Account> findCompanyByName(String name) {
        return jdbc.query(ACCOUNT_SELECT + " WHERE u.role='company' AND LOWER(u.name)=LOWER(?)",
                ACCOUNT, name).stream().findFirst();
    }
    @Override public String createStudentOrCompany(
            ApiModels.RegistrationRequest r, String hash, String institutionId) {
        String id = UUID.randomUUID().toString();
        jdbc.update("""
                INSERT INTO users(id,name,email,password_hash,role,institution_id,cpf,rg,address,course,
                                  cnpj,responsible,description,balance)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0)
                """, id, r.name().trim(), r.email().trim(), hash, r.role().toLowerCase(java.util.Locale.ROOT), institutionId,
                nullableDigits(r.cpf()), nullable(r.rg()), nullable(r.address()), nullable(r.course()),
                nullableDigits(r.cnpj()), nullable(r.responsible()), nullable(r.description()));
        return id;
    }
    @Override public String createRegisteredTeacher(
            ApiModels.RegistrationRequest r, String hash, String institutionId) {
        String id = UUID.randomUUID().toString();
        TeacherIdentity identity = jdbc.query("""
                SELECT name,department FROM pre_registered_teachers
                WHERE cpf=? AND institution_id=? AND user_id IS NULL FOR UPDATE
                """, (rs, row) -> new TeacherIdentity(rs.getString("name"), rs.getString("department")),
                digits(r.cpf()), institutionId).stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Professor não pré-cadastrado para esta instituição."));
        jdbc.update("""
                INSERT INTO users(id,name,email,password_hash,role,institution_id,cpf,department,balance)
                VALUES(?,?,?,?,'teacher',?,?,?,0)
                """, id, identity.name(), r.email().trim(), hash, institutionId, digits(r.cpf()), identity.department());
        int changed = jdbc.update("""
                UPDATE pre_registered_teachers SET user_id=?
                WHERE cpf=? AND institution_id=? AND user_id IS NULL
                """, id, digits(r.cpf()), institutionId);
        if (changed != 1) throw new IllegalArgumentException("Professor não pré-cadastrado para esta instituição.");
        return id;
    }
    private record TeacherIdentity(String name, String department) {}
    @Override public Optional<String> registeredTeacherInstitution(String cpf) {
        return jdbc.query("""
                SELECT institution_id FROM pre_registered_teachers
                WHERE cpf=? AND user_id IS NULL
                """, (rs, row) -> rs.getString(1), digits(cpf)).stream().findFirst();
    }

    @Override public void createSession(String tokenHash, String userId) {
        jdbc.update("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
                tokenHash, userId, java.sql.Timestamp.from(Instant.now().plusSeconds(60L * 60 * 24 * 7)));
    }
    @Override public Optional<String> findSessionUser(String tokenHash) {
        return jdbc.query("""
                SELECT user_id FROM auth_sessions WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP
                """, (rs, row) -> rs.getString(1), tokenHash).stream().findFirst();
    }
    @Override public void deleteSession(String tokenHash) {
        jdbc.update("DELETE FROM auth_sessions WHERE token_hash=?", tokenHash);
    }

    @Override public Optional<String> classroomForStudent(String studentId) {
        return jdbc.query("""
                SELECT c.id FROM classrooms c JOIN classroom_students cs ON cs.classroom_id=c.id
                WHERE cs.student_id=? ORDER BY c.name LIMIT 1
                """, (rs, row) -> rs.getString(1), studentId).stream().findFirst();
    }
    @Override public List<String> sharedTeachers(String first, String second) {
        return jdbc.query("""
                SELECT DISTINCT u.name FROM classroom_students a
                JOIN classroom_students b ON b.classroom_id=a.classroom_id
                JOIN classroom_teachers ct ON ct.classroom_id=a.classroom_id
                JOIN users u ON u.id=ct.teacher_id AND u.role='teacher'
                WHERE a.student_id=? AND b.student_id=? ORDER BY u.name
                """, (rs, row) -> rs.getString(1), first, second);
    }
    @Override public Optional<String> sharedClassroomId(String first, String second) {
        return jdbc.query("""
                SELECT DISTINCT a.classroom_id FROM classroom_students a
                JOIN classroom_students b ON b.classroom_id=a.classroom_id
                JOIN classroom_teachers ct ON ct.classroom_id=a.classroom_id
                JOIN users u ON u.id=ct.teacher_id AND u.role='teacher'
                WHERE a.student_id=? AND b.student_id=? ORDER BY a.classroom_id LIMIT 1
                """, (rs, row) -> rs.getString(1), first, second).stream().findFirst();
    }
    @Override public List<String> sharedTeachers(String first, String second, String classroomId) {
        return jdbc.query("""
                SELECT DISTINCT u.name FROM classroom_students a
                JOIN classroom_students b ON b.classroom_id=a.classroom_id
                JOIN classroom_teachers ct ON ct.classroom_id=a.classroom_id
                JOIN users u ON u.id=ct.teacher_id AND u.role='teacher'
                WHERE a.student_id=? AND b.student_id=? AND a.classroom_id=? ORDER BY u.name
                """, (rs, row) -> rs.getString(1), first, second, classroomId);
    }
    @Override public List<String> classroomTeachers(String studentId) {
        return jdbc.query("""
                SELECT DISTINCT u.name FROM classroom_students cs
                JOIN classroom_teachers ct ON ct.classroom_id=cs.classroom_id
                JOIN users u ON u.id=ct.teacher_id AND u.role='teacher' WHERE cs.student_id=? ORDER BY u.name
                """, (rs, row) -> rs.getString(1), studentId);
    }
    @Override public String classroomName(String classroomId) {
        return jdbc.query("SELECT name FROM classrooms WHERE id=?", (rs, row) -> rs.getString(1), classroomId)
                .stream().findFirst().orElse("");
    }
    @Override public boolean teacherCanReview(String teacherId, String classroomId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM classroom_teachers ct
                JOIN users u ON u.id=ct.teacher_id AND u.role='teacher'
                WHERE ct.teacher_id=? AND ct.classroom_id=?)
                """, Boolean.class, teacherId, classroomId));
    }
    @Override public List<ApiModels.Account> studentsInClassroom(String teacherId) {
        return jdbc.query(ACCOUNT_SELECT + """
                 JOIN classroom_students cs ON cs.student_id=u.id
                 JOIN classroom_teachers ct ON ct.classroom_id=cs.classroom_id
                 WHERE ct.teacher_id=? ORDER BY u.name
                """, ACCOUNT, teacherId);
    }
    @Override public boolean reserveBalance(String userId, int amount) {
        return jdbc.update("UPDATE users SET balance=balance-? WHERE id=? AND balance>=?", amount, userId, amount) == 1;
    }
    @Override public void addBalance(String userId, int amount) {
        jdbc.update("UPDATE users SET balance=balance+? WHERE id=?", amount, userId);
    }
    @Override public void addTransaction(String userId, String kind, String title, String description, int amount, String code) {
        jdbc.update("""
                INSERT INTO transactions(id,user_id,kind,title,description,amount,code,created_at)
                VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
                """, UUID.randomUUID().toString(), userId, kind, title, description, amount, code);
    }
    @Override public List<ApiModels.TransactionView> transactions(String userId) {
        return jdbc.query("""
                SELECT id,title,description,created_at,amount,kind,code FROM transactions
                WHERE user_id=? ORDER BY created_at DESC
                """, (rs, row) -> new ApiModels.TransactionView(
                rs.getString("id"), rs.getString("title"), rs.getString("description"),
                rs.getTimestamp("created_at").toInstant(), rs.getInt("amount"),
                rs.getString("kind"), rs.getString("code")), userId);
    }

    @Override public String createTransfer(String sender, String receiver, String classroom, int amount, String reason) {
        String id = UUID.randomUUID().toString();
        jdbc.update("""
                INSERT INTO transfers(id,sender_id,receiver_id,classroom_id,amount,reason,status,created_at)
                VALUES(?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)
                """, id, sender, receiver, classroom, amount, reason.trim());
        return id;
    }
    @Override public List<ApiModels.TransferView> transfers(String userId, String role) {
        String sql = """
                SELECT t.id,t.sender_id,s.name sender_name,t.receiver_id,r.name receiver_name,
                       t.classroom_id,c.name classroom,t.amount,t.reason,t.status,t.created_at
                FROM transfers t JOIN users s ON s.id=t.sender_id JOIN users r ON r.id=t.receiver_id
                JOIN classrooms c ON c.id=t.classroom_id
                WHERE (t.sender_id=? OR t.receiver_id=?)
                ORDER BY t.created_at DESC
                """;
        if ("teacher".equals(role)) sql = """
                SELECT t.id,t.sender_id,s.name sender_name,t.receiver_id,r.name receiver_name,
                       t.classroom_id,c.name classroom,t.amount,t.reason,t.status,t.created_at
                FROM transfers t JOIN users s ON s.id=t.sender_id JOIN users r ON r.id=t.receiver_id
                JOIN classrooms c ON c.id=t.classroom_id
                JOIN classroom_teachers ct ON ct.classroom_id=t.classroom_id AND ct.teacher_id=?
                WHERE t.status='pending' ORDER BY t.created_at DESC
                """;
        String finalSql = sql;
        return jdbc.query(finalSql, (rs, row) -> {
            String classroomId = rs.getString("classroom_id");
            return new ApiModels.TransferView(rs.getString("id"), rs.getString("sender_id"),
                    rs.getString("sender_name"), rs.getString("receiver_id"), rs.getString("receiver_name"),
                    rs.getInt("amount"), rs.getString("reason"), rs.getString("classroom"),
                    teachersForClassroom(classroomId), rs.getString("status"),
                    rs.getTimestamp("created_at").toInstant());
        }, "teacher".equals(role) ? new Object[]{userId} : new Object[]{userId, userId});
    }
    private List<String> teachersForClassroom(String id) {
        return jdbc.query("""
                SELECT u.name FROM classroom_teachers ct JOIN users u ON u.id=ct.teacher_id AND u.role='teacher'
                WHERE ct.classroom_id=? ORDER BY u.name
                """, (rs, row) -> rs.getString(1), id);
    }
    @Override public Optional<TransferDetails> transfer(String id) {
        return jdbc.query("""
                SELECT t.id,t.sender_id,s.name sender_name,t.receiver_id,r.name receiver_name,
                       t.classroom_id,t.amount,t.reason,t.status,t.created_at
                FROM transfers t JOIN users s ON s.id=t.sender_id JOIN users r ON r.id=t.receiver_id
                WHERE t.id=?
                """, (rs, row) -> new TransferDetails(rs.getString("id"), rs.getString("sender_id"),
                rs.getString("sender_name"), rs.getString("receiver_id"), rs.getString("receiver_name"),
                rs.getString("classroom_id"), rs.getInt("amount"), rs.getString("reason"),
                rs.getString("status"), rs.getTimestamp("created_at").toInstant()), id).stream().findFirst();
    }
    @Override public boolean updateTransferStatus(String id, String status) {
        return jdbc.update("UPDATE transfers SET status=? WHERE id=? AND status='pending'", status, id) == 1;
    }

    private static final RowMapper<ApiModels.BenefitView> BENEFIT = (rs, row) -> new ApiModels.BenefitView(
            rs.getString("id"), rs.getString("title"), rs.getString("company"), rs.getString("description"),
            rs.getInt("cost"), rs.getString("category"), rs.getString("image"), rs.getBoolean("active"));
    private static final String BENEFIT_SELECT = """
            SELECT b.id,b.title,u.name company,b.description,b.cost,b.category,b.image,b.active
            FROM benefits b JOIN users u ON u.id=b.company_id
            """;
    @Override public List<ApiModels.BenefitView> benefits() {
        return jdbc.query(BENEFIT_SELECT + " WHERE b.active=TRUE ORDER BY b.title", BENEFIT);
    }
    @Override public List<ApiModels.BenefitView> companyBenefits(String id) {
        return jdbc.query(BENEFIT_SELECT + " WHERE b.company_id=? ORDER BY b.title", BENEFIT, id);
    }
    @Override public String createBenefit(String companyId, ApiModels.BenefitRequest r) {
        String id = UUID.randomUUID().toString();
        jdbc.update("""
                INSERT INTO benefits(id,company_id,title,description,cost,category,image,active)
                VALUES(?,?,?,?,?,?,?,TRUE)
                """, id, companyId, r.title().trim(), r.description().trim(), r.cost(),
                r.category().trim(), r.image().trim());
        return id;
    }
    @Override public Optional<ApiModels.BenefitView> benefit(String id) {
        return jdbc.query(BENEFIT_SELECT + " WHERE b.id=?", BENEFIT, id).stream().findFirst();
    }
    @Override public String createRedemption(String studentId, String benefitId, String companyId, String code) {
        String id = UUID.randomUUID().toString();
        jdbc.update("""
                INSERT INTO redemptions(id,student_id,benefit_id,company_id,code,used,created_at)
                VALUES(?,?,?,?,?,FALSE,CURRENT_TIMESTAMP)
                """, id, studentId, benefitId, companyId, code);
        return id;
    }
    @Override public Optional<RedemptionDetails> redemptionByCode(String code) {
        return jdbc.query("""
                SELECT r.code,b.title benefit,u.name company,s.name student,r.company_id,r.used,r.created_at
                FROM redemptions r JOIN benefits b ON b.id=r.benefit_id
                JOIN users u ON u.id=r.company_id JOIN users s ON s.id=r.student_id
                WHERE r.code=?
                """, REDEMPTION, code).stream().findFirst();
    }
    @Override public List<RedemptionDetails> companyRedemptions(String companyId) {
        return jdbc.query("""
                SELECT r.code,b.title benefit,u.name company,s.name student,r.company_id,r.used,r.created_at
                FROM redemptions r JOIN benefits b ON b.id=r.benefit_id
                JOIN users u ON u.id=r.company_id JOIN users s ON s.id=r.student_id
                WHERE r.company_id=? ORDER BY r.created_at DESC
                """, REDEMPTION, companyId);
    }
    private static final RowMapper<RedemptionDetails> REDEMPTION = (rs, row) -> new RedemptionDetails(
            rs.getString("code"), rs.getString("benefit"), rs.getString("company"),
            rs.getString("student"), rs.getString("company_id"), rs.getBoolean("used"),
            rs.getTimestamp("created_at").toInstant());
    @Override public boolean markCouponUsed(String code) {
        return jdbc.update("UPDATE redemptions SET used=TRUE WHERE code=? AND used=FALSE", code) == 1;
    }
    @Override public boolean creditSemester(String teacherId, String semesterKey) {
        int inserted = jdbc.update("""
                INSERT IGNORE INTO semester_credits(id,teacher_id,semester_key,credited_at)
                VALUES(?,?,?,CURRENT_TIMESTAMP)
                """, UUID.randomUUID().toString(), teacherId, semesterKey);
        if (inserted != 1) return false;
        addBalance(teacherId, 1000);
        addTransaction(teacherId, "received", "Crédito semestral",
                "Crédito de 1.000 moedas do semestre " + semesterKey, 1000, null);
        return true;
    }

    private static String nullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
    private static String nullableDigits(String value) {
        return value == null || value.isBlank() ? null : digits(value);
    }
    private static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }
}
