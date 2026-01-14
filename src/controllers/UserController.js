const UserService = require('../services/UserService')

class UserController {
    async handleCreate(req, res) {
        try {
            // normalmente, isso vem do req.user.id (middleware de auth)
            // por enquanto, para testar a task, vou esperar que o front mande um header 'x-user-id'
            
            const requestingUserId = req.headers['x-user-id'] || req.body.admin_id;

            const newUser = await UserService.createUser(requestingUserId, req.body)

            return res.status(201).json(newUser)

        } catch (error) {
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({ status: "error", message: error.message })
        }
    }

    async handleList(req, res) {
        try {
            const users = await UserService.getUsers(req.query)

            return res.status(200).json(users)

        } catch (error) {
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({ status: "error", message: error.message })
        }
    }
}

module.exports = new UserController();