const router = require('express').Router()
const CourseController = require('../controllers/CourseController')

router.post('/', CourseController.handleCreate)
router.get('/', CourseController.handleList)
router.put('/:id', CourseController.handleUpdate)
router.delete('/:id', CourseController.handleDelete)

module.exports = router