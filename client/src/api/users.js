import client from './client'

// GET /api/users - list internal users (any authenticated internal role)
export const getUsers = () => client.get('/users')
// POST /api/users - admin-only, provisions sales_manager/finance/admin accounts
export const createUser = (data) => client.post('/users', data)
