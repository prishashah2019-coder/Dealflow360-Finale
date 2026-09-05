import client from './client'

// GET /api/deal-health
export const getDealHealth = () => client.get('/deal-health')
// GET /api/deal-health/nudges-for-me - sales_rep sees nudges/escalations aimed at their own deals
export const getNudgesForMe = () => client.get('/deal-health/nudges-for-me')
// POST /api/deal-health/nudge { quotationId }
export const nudgeRep = (quotationId) => client.post('/deal-health/nudge', { quotationId })
// POST /api/deal-health/escalate { quotationId }
export const escalateDeal = (quotationId) => client.post('/deal-health/escalate', { quotationId })
