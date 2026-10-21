CREATE TABLE IF NOT EXISTS institutions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(180) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    institution_id VARCHAR(36),
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(30),
    address VARCHAR(300),
    course VARCHAR(160),
    department VARCHAR(160),
    cnpj VARCHAR(20) UNIQUE,
    responsible VARCHAR(180),
    description TEXT,
    balance INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_user_institution FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

CREATE TABLE IF NOT EXISTS pre_registered_teachers (
    cpf VARCHAR(14) PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    department VARCHAR(160) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) UNIQUE,
    CONSTRAINT fk_teacher_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_registered_teacher_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classrooms (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    CONSTRAINT fk_classroom_institution FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

CREATE TABLE IF NOT EXISTS classroom_students (
    classroom_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (classroom_id, student_id),
    CONSTRAINT fk_class_student_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_student_user FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classroom_teachers (
    classroom_id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (classroom_id, teacher_id),
    CONSTRAINT fk_class_teacher_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_teacher_user FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    kind VARCHAR(24) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    amount INT NOT NULL,
    code VARCHAR(40),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_transactions_user_date (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS transfers (
    id VARCHAR(36) PRIMARY KEY,
    sender_id VARCHAR(36) NOT NULL,
    receiver_id VARCHAR(36) NOT NULL,
    classroom_id VARCHAR(36) NOT NULL,
    amount INT NOT NULL,
    reason VARCHAR(300) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transfer_sender FOREIGN KEY (sender_id) REFERENCES users(id),
    CONSTRAINT fk_transfer_receiver FOREIGN KEY (receiver_id) REFERENCES users(id),
    CONSTRAINT fk_transfer_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
    INDEX idx_transfers_status_classroom (status, classroom_id)
);

CREATE TABLE IF NOT EXISTS benefits (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    cost INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    image VARCHAR(1000) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_benefit_company FOREIGN KEY (company_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS redemptions (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    benefit_id VARCHAR(36) NOT NULL,
    company_id VARCHAR(36) NOT NULL,
    code VARCHAR(40) NOT NULL UNIQUE,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_redemption_student FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT fk_redemption_benefit FOREIGN KEY (benefit_id) REFERENCES benefits(id),
    CONSTRAINT fk_redemption_company FOREIGN KEY (company_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS semester_credits (
    id VARCHAR(36) PRIMARY KEY,
    teacher_id VARCHAR(36) NOT NULL,
    semester_key VARCHAR(16) NOT NULL,
    credited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_semester_teacher (teacher_id, semester_key),
    CONSTRAINT fk_credit_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

INSERT IGNORE INTO institutions(id,name) VALUES
    ('inst-universidade-metropolitana','Universidade Metropolitana'),
    ('inst-puc-minas','PUC Minas'),
    ('inst-ufmg','Universidade Federal de Minas Gerais');
