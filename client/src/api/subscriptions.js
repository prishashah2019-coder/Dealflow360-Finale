import client from './client'

// GET /api/subscriptions
export const getSubscriptions = () => client.get('/subscriptions')
// GET /api/subscriptions/:id
export const getSubscription = (id) => client.get(`/subscriptions/${id}`)
// POST /api/subscriptions/:id/modify
export const modifySubscription = (id, data) => client.post(`/subscriptions/${id}/modify`, data)
// POST /api/subscriptions/:id/cancel
export const cancelSubscription = (id) => client.post(`/subscriptions/${id}/cancel`)
