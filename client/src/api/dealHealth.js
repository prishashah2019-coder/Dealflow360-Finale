import client from './client'

// GET /api/deal-health
export const getDealHealth = () => client.get('/deal-health')
// POST /api/deal-health/nudge { quotationId }
export const nudgeRep = (quotationId) => client.post('/deal-health/nudge', { quotationId })
// POST /api/deal-health/escalate { quotationId }
export const escalateDeal = (quotationId) => client.post('/deal-health/escalate', { quotationId })
