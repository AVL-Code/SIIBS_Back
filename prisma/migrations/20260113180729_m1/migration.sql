/*
  Warnings:

  - You are about to drop the `attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attendance_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `class_reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `class_reports_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `classes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `classes_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `courses_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `enrollments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `enrollments_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `guardians` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `guardians_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `medical_certificates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `medical_certificates_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_guardian` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_guardian_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `students` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `students_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `waitlist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `waitlist_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_enrollment_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_medical_cert_id_fkey";

-- DropForeignKey
ALTER TABLE "class_reports" DROP CONSTRAINT "class_reports_class_id_fkey";

-- DropForeignKey
ALTER TABLE "class_reports" DROP CONSTRAINT "class_reports_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_course_id_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_class_id_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_guardians_id_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_student_id_fkey";

-- DropForeignKey
ALTER TABLE "guardians" DROP CONSTRAINT "guardians_user_id_fkey";

-- DropForeignKey
ALTER TABLE "medical_certificates" DROP CONSTRAINT "medical_certificates_enrollment_id_fkey";

-- DropForeignKey
ALTER TABLE "medical_certificates" DROP CONSTRAINT "medical_certificates_uploaded_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "student_guardian" DROP CONSTRAINT "student_guardian_guardian_id_fkey";

-- DropForeignKey
ALTER TABLE "student_guardian" DROP CONSTRAINT "student_guardian_student_id_fkey";

-- DropForeignKey
ALTER TABLE "waitlist" DROP CONSTRAINT "waitlist_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "waitlist" DROP CONSTRAINT "waitlist_guardian_user_id_fkey";

-- DropForeignKey
ALTER TABLE "waitlist" DROP CONSTRAINT "waitlist_target_class_id_fkey";

-- DropForeignKey
ALTER TABLE "waitlist" DROP CONSTRAINT "waitlist_target_course_id_fkey";

-- DropTable
DROP TABLE "attendance";

-- DropTable
DROP TABLE "attendance_log";

-- DropTable
DROP TABLE "class_reports";

-- DropTable
DROP TABLE "class_reports_log";

-- DropTable
DROP TABLE "classes";

-- DropTable
DROP TABLE "classes_log";

-- DropTable
DROP TABLE "courses";

-- DropTable
DROP TABLE "courses_log";

-- DropTable
DROP TABLE "enrollments";

-- DropTable
DROP TABLE "enrollments_log";

-- DropTable
DROP TABLE "guardians";

-- DropTable
DROP TABLE "guardians_log";

-- DropTable
DROP TABLE "medical_certificates";

-- DropTable
DROP TABLE "medical_certificates_log";

-- DropTable
DROP TABLE "student_guardian";

-- DropTable
DROP TABLE "student_guardian_log";

-- DropTable
DROP TABLE "students";

-- DropTable
DROP TABLE "students_log";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "users_log";

-- DropTable
DROP TABLE "waitlist";

-- DropTable
DROP TABLE "waitlist_log";

-- DropEnum
DROP TYPE "user_role";
