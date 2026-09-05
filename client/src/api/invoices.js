import client from './client'

// GET /api/invoices
export const getInvoices = () => client.get('/invoices')
// GET /api/invoices/:id
export const getInvoice = (id) => client.get(`/invoices/${id}`)
// POST /api/invoices/:id/payments
export const recordPayment = (id, data) => client.post(`/invoices/${id}/payments`, data)
