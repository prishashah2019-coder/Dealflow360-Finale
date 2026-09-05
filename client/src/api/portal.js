import client from './client'

// GET /api/portal/quotations/:id
export const getPortalQuotation = (id) => client.get(`/portal/quotations/${id}`)
// POST /api/portal/quotations/:id/comments { lineId, commentText, counterDiscountPct }
export const addPortalComment = (id, data) => client.post(`/portal/quotations/${id}/comments`, data)
// POST /api/portal/quotations/:id/confirm
export const confirmPortalQuotation = (id) => client.post(`/portal/quotations/${id}/confirm`)
