const CourseService = require('../services/CourseService')

class CourseController {
    async handleCreate(req, res) {
        try {
            const newCourse = await CourseService.createCourse(req.body)

            return res.status(201).json(newCourse)

        } catch (error) {
            const statusCode = error.statusCode || 500;
            
            return res.status(statusCode).json({ status: "error", message: error.message })
        }
    }

    async handleList(req, res) {
        try {
            const courses = await CourseService.getCourse(req.query)

            return res.status(200).json(courses)

        } catch (error) {
            const statusCode = error.statusCode || 500;
            
            return res.status(statusCode).json({ status: "error", message: error.message })
        }
    }
    
    async handleUpdate(req, res) {
        try {
            const updatedCourse = await CourseService.updateCourse(req.params, req.body)

            return res.status(201).json(updatedCourse)

        } catch (error) {
            const statusCode = error.statusCode || 500;
            
            return res.status(statusCode).json({ status: "error", message: error.message })
        }
    }

    async handleDelete(req, res) {
        try {
            await CourseService.deleteCourse(req.params)

            return res.status(200).json({ message: "Course successfully deleted"})

        } catch (error) {
            const statusCode = error.statusCode || 500;
            
            return res.status(statusCode).json({ status: "error", message: error.message })
        }
    }
}

module.exports = new CourseController();