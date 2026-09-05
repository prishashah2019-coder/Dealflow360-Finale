import client from './client'

// GET /api/quotations
export const getQuotations = () => client.get('/quotations')
// POST /api/quotations
export const createQuotation = (data) => client.post('/quotations', data)
// GET /api/quotations/:id
export const getQuotation = (id) => client.get(`/quotations/${id}`)
// PUT /api/quotations/:id (edit lines while Draft)
export const updateQuotation = (id, data) => client.put(`/quotations/${id}`, data)
// POST /api/quotations/:id/negotiation/comments
export const addNegotiationComment = (id, data) => client.post(`/quotations/${id}/negotiation/comments`, data)
// POST /api/quotations/:id/submit-for-approval
export const submitForApproval = (id) => client.post(`/quotations/${id}/submit-for-approval`)
// POST /api/quotations/:id/fulfillment/suggest
export const suggestFulfillment = (id) => client.post(`/quotations/${id}/fulfillment/suggest`)
// POST /api/quotations/:id/fulfillment/accept
export const acceptFulfillment = (id) => client.post(`/quotations/${id}/fulfillment/accept`)
// POST /api/quotations/:id/fulfillment/override { splits: [...] }
export const overrideFulfillment = (id, splits) =>
  client.post(`/quotations/${id}/fulfillment/override`, { splits })
// POST /api/quotations/:id/confirm
export const confirmQuotation = (id) => client.post(`/quotations/${id}/confirm`)
