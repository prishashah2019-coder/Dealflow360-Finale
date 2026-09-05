import client from './client'

// GET /api/discount-config (tiers + category ceilings + approval chain rules)
export const getDiscountConfig = () => client.get('/discount-config')
// PUT /api/discount-config
export const updateDiscountConfig = (data) => client.put('/discount-config', data)
