import client from './client'

// GET /api/reports?period=&repId=&status=&productId=
export const getReports = (params = {}) => client.get('/reports', { params })
// GET /api/users (for the Sales Team filter)
export const getUsers = () => client.get('/users')
