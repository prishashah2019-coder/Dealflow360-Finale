import client from './client'

// GET /api/audit-log - admin only
export const getAuditLog = () => client.get('/audit-log')
