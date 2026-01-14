CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('ADMIN', 'SUPERVISOR', 'TEACHER', 'GUARDIAN');

CREATE OR REPLACE FUNCTION trigger_log_audit() RETURNS TRIGGER AS $$
DECLARE
    log_table_name TEXT;
BEGIN
    log_table_name := TG_TABLE_NAME || '_log';
    
    IF (TG_OP = 'DELETE') THEN
        EXECUTE format('INSERT INTO %I (original_id, action, old_data, created_at, created_by) VALUES ($1, $2, $3, NOW(), current_setting(''app.current_user_id'', true)::uuid)', log_table_name)
        USING OLD.id, 'DELETE', row_to_json(OLD);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        EXECUTE format('INSERT INTO %I (original_id, action, old_data, new_data, created_at, created_by) VALUES ($1, $2, $3, $4, NOW(), current_setting(''app.current_user_id'', true)::uuid)', log_table_name)
        USING NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        EXECUTE format('INSERT INTO %I (original_id, action, new_data, created_at, created_by) VALUES ($1, $2, $3, NOW(), current_setting(''app.current_user_id'', true)::uuid)', log_table_name)
        USING NEW.id, 'INSERT', row_to_json(NEW);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    email varchar(255) NOT NULL,
    password_hash varchar(255) NOT NULL,
    role user_role NOT NULL,
    is_active boolean NOT NULL DEFAULT True,
    created_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_pk PRIMARY KEY (id)
);

CREATE TABLE users_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT users_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_users_audit AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();

CREATE TABLE guardians (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NULL REFERENCES users(id), 
    name varchar(255) NOT NULL,
    birth_date date NOT NULL,
    national_id varchar(20) NOT NULL,
    photo_doc text NULL,
    phone varchar(20) NOT NULL,
    address_proof text NOT NULL,
    status varchar(50) NULL,
    created_at timestamp DEFAULT NOW(),
    CONSTRAINT guardians_pk PRIMARY KEY (id)
);

CREATE TABLE guardians_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT guardians_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_guardians_audit AFTER INSERT OR UPDATE OR DELETE ON guardians FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();

CREATE TABLE students (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    birth_date date NOT NULL,
    document text NULL,
    photo text NULL,
    address_proof text NOT NULL,
    school_enrollment text NOT NULL,
    is_adult boolean NOT NULL DEFAULT false,
    status varchar(50) NOT NULL DEFAULT 'active',
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT students_pk PRIMARY KEY (id)
);

CREATE TABLE students_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT students_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_students_audit AFTER INSERT OR UPDATE OR DELETE ON students FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();

CREATE TABLE student_guardian (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    student_id uuid NOT NULL REFERENCES students(id),
    guardian_id uuid NOT NULL REFERENCES guardians(id),
    is_primary boolean NOT NULL DEFAULT false,
    CONSTRAINT student_guardian_pk PRIMARY KEY (id)
);

CREATE TABLE student_guardian_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT student_guardian_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_student_guardian_audit AFTER INSERT OR UPDATE OR DELETE ON student_guardian FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();

CREATE TABLE courses (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    teacher_id uuid NOT NULL REFERENCES users(id),
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_slots integer NOT NULL,
    for_adults boolean NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT courses_pk PRIMARY KEY (id)
);

CREATE TABLE courses_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT courses_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_courses_audit AFTER INSERT OR UPDATE OR DELETE ON courses FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();

CREATE TABLE classes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    course_id uuid NOT NULL REFERENCES courses(id),
    class_name varchar(100) NOT NULL,
    schedule jsonb NOT NULL,
    class_slots integer NOT NULL,
    CONSTRAINT classes_pk PRIMARY KEY (id)
);

CREATE TABLE classes_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT classes_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_classes_audit AFTER INSERT OR UPDATE OR DELETE ON classes FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();

CREATE TABLE enrollments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    student_id uuid NULL REFERENCES students(id),
    guardians_id uuid NULL REFERENCES guardians(id), 
    class_id uuid NOT NULL REFERENCES classes(id),
    status varchar(20) NOT NULL DEFAULT 'active',
    enrollment_date timestamp NOT NULL DEFAULT now(),
    
    dismissal_date timestamp NULL, 
    dismissal_reason text NULL,
    
    guardian_signature text NULL, 
    CONSTRAINT enrollments_pk PRIMARY KEY (id)
);

CREATE TABLE enrollments_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT enrollments_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_enrollments_audit AFTER INSERT OR UPDATE OR DELETE ON enrollments FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();


CREATE TABLE waitlist (
    id uuid NOT NULL DEFAULT uuid_generate_v4(), 
    candidate_id uuid NOT NULL REFERENCES students(id), 
    guardian_user_id uuid NULL REFERENCES users(id), 
    target_course_id uuid NOT NULL REFERENCES courses(id),
    target_class_id uuid NULL REFERENCES classes(id), 
    entry_date timestamp NOT NULL DEFAULT now(),
    status varchar(20) NOT NULL DEFAULT 'waiting',
    CONSTRAINT waitlist_pk PRIMARY KEY (id)
);

CREATE TABLE waitlist_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT waitlist_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_waitlist_audit AFTER INSERT OR UPDATE OR DELETE ON waitlist FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();

CREATE TABLE medical_certificates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    enrollment_id uuid NULL REFERENCES enrollments(id),
    file text NOT NULL,
    uploaded_by_user_id uuid NOT NULL REFERENCES users(id),
    upload_date timestamp NOT NULL DEFAULT now(),
    CONSTRAINT medical_certificates_pk PRIMARY KEY (id)
);

CREATE TABLE medical_certificates_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT medical_certificates_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_medical_certificates_audit AFTER INSERT OR UPDATE OR DELETE ON medical_certificates FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();

CREATE TABLE attendance (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    enrollment_id uuid NULL REFERENCES enrollments(id),
    class_date date NOT NULL,
    status char(2) NOT NULL,
    
    medical_cert_id uuid NULL REFERENCES medical_certificates(id), 
    
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT CHECK_STATUS CHECK (( status IN ( 'P' , 'F' , 'EA' ) )),
    CONSTRAINT attendance_pk PRIMARY KEY (id)
);

CREATE TABLE attendance_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT attendance_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_attendance_audit AFTER INSERT OR UPDATE OR DELETE ON attendance FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();

CREATE TABLE class_reports (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    teacher_id uuid NOT NULL REFERENCES users(id),
    class_id uuid NOT NULL REFERENCES classes(id),
    reference_month date NOT NULL,
    content text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT class_reports_pk PRIMARY KEY (id)
);

CREATE TABLE class_reports_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    original_id uuid NULL,
    action varchar(10) NULL,
    old_data jsonb NULL,
    new_data jsonb NULL,
    created_at timestamp NULL DEFAULT now(),
    created_by uuid NULL,
    CONSTRAINT class_reports_log_pk PRIMARY KEY (id)
);
CREATE TRIGGER tg_class_reports_audit AFTER INSERT OR UPDATE OR DELETE ON class_reports FOR EACH ROW EXECUTE FUNCTION trigger_log_audit();