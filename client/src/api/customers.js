import client from './client'

// GET /api/customers
export const getCustomers = () => client.get('/customers')
