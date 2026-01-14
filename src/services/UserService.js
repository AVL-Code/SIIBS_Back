const AppError = require('../utils/AppError')
const bcrypt = require('bcryptjs')
const { prisma, dbAuthAction } = require('../lib/database') 

class UserService {
    /**
     * @param {string} requestingUserId - id do userf que ta tentado criar
     * @param {object} userData - dados do novo user
     */
    async createUser(requestingUserId, userData) {
        

        if (!requestingUserId) {
            throw new AppError('Access denied. User ID required for auditing.', 403)
        }

        const requester = await prisma.users.findUnique({
            where: { id: requestingUserId }
        })

        if (!requester || requester.role !== 'ADMIN') {
            throw new AppError('Only Administrators can create new users.', 403)
        }

        if (!userData.name) {
            throw new AppError('Name is required', 422)
        }
        
        if (!userData.email) {
            throw new AppError('Email is required', 422)
        } else {
            const userExists = await prisma.users.findUnique({
                where: { email: userData.email }
            })
            if (userExists) {
                throw new AppError('Email already in use.', 409) 
            }
        }

        if (!userData.password) {
            throw new AppError('Password is required', 422)
        }

        if (!userData.role) {
            throw new AppError('Role is required', 422)
        } else {
            const validRoles = ['ADMIN', 'SUPERVISOR', 'TEACHER', 'GUARDIAN']
            if (!validRoles.includes(userData.role)) {
                throw new AppError('Invalid role', 422)
            }
        }

        const passwordHash = await bcrypt.hash(userData.password, 8)

        return await dbAuthAction(requestingUserId, async (tx) => {
            return await tx.users.create({
                data: {
                    name: userData.name,
                    email: userData.email,
                    password_hash: passwordHash, 
                    role: userData.role,
                    is_active: userData.is_active !== undefined ? userData.is_active : true
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    is_active: true,
                    created_at: true
                }
            })
        })
    }

    async getUsers(filters = {}) {
        const where = {}

        if (filters.is_active !== undefined) {
            where.is_active = filters.is_active === 'true'
        }

        if (filters.role) {
            where.role = filters.role
        }

        return await prisma.users.findMany({
            where: where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                is_active: true
            }
        })
    }
}

module.exports = new UserService();