const router = require('express').Router()
const UserController = require('../controllers/UserController')

router.post('/', UserController.handleCreate)
router.get('/', UserController.handleList)

module.exports = router