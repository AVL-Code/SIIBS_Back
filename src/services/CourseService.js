const AppError = require('../utils/AppError')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

class CourseService {
    async createCourse(courseData) {

        if (!courseData.name) {
            throw new AppError('Name is required', 422)
        } else {
            if (await prisma.courses.findFirst({ where: { name: courseData.name }})) {
                throw new AppError('There is already a course with that name.', 422)
            }
        }

        if (!courseData.teacher_id) {
            throw new AppError('Teacher is required', 422)
        } else {
            if (!await prisma.users.findUnique({ where: { id: courseData.teacher_id, role: "TEACHER" }})) {
                throw new AppError('Teacher not found', 404)
            }
        }

        if (!courseData.start_date || !courseData.end_date) {
            throw new AppError('Stard date and end date is required', 422)
        } else {
            if (courseData.end_date < courseData.start_date) {
                throw new AppError('Start date and end date must be a valid date', 422)
            }
        }
    
        if (!courseData.total_slots) {
            throw new AppError('Total slots is required', 422)
        } else {
            if (typeof courseData.total_slots !== 'number' || courseData.total_slots < 1) {
                throw new AppError('Total slots must be a non-negative number', 422)
            }
        }

        return await prisma.courses.create({ data: courseData}) 
    }

    async getCourse({ teacher_id } = {}) {
        if(teacher_id) {
            if (!await prisma.users.findUnique({ where: { id: teacher_id }})) {
                throw new Error('Teacher not found', 404)
            }
        }

        // Se não houver teacherID, o prisma ignorará a cláusula where.
        return await prisma.courses.findMany({ where: { teacher_id: teacher_id }})
    }

    async updateCourse({ id }, courseData) {
        if (courseData.name !== undefined && courseData.name.trim() === '') {
            throw new AppError('Name cannot be empty', 422)
        } else {
            if (await prisma.courses.findFirst({ where: { name: courseData.name }})) {
                throw new AppError('There is already a course with that name.', 422)
            }
        }

        if (courseData.teacher_id !== undefined) {
            if (!courseData.teacher_id) {
                throw new AppError('Teacher is required', 422)
            } else {
                if (!await prisma.users.findUnique({ where: { id: courseData.teacher_id, role: "TEACHER" }})) {
                    throw new AppError('Teacher not found', 404)
                }
            }
        }

        if (courseData.start_date !== undefined && courseData.end_date !== undefined && courseData.end_date < courseData.start_date && courseData.start_date.trim() === '' && courseData.end_date.trim() === '') {
            throw new AppError('Start date and end date must be a valid date', 422)
        }
        
        if (courseData.total_slots !== undefined && (typeof courseData.total_slots !== 'number') && courseData.total_slots < 1) {
            throw new AppError('Total slots must be a non-negative number', 422)
        }

        return await prisma.courses.update({ where: {id: id}, data: courseData}) 
    }

    async deleteCourse({ id }){
        if(!await prisma.courses.findUnique({ where: { id: id }})) {
            throw new AppError('Course not found', 404)
        } 

        await prisma.courses.delete({ where: {id: id}})
    }
}

module.exports = new CourseService();