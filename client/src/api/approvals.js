import client from './client'

// POST /api/quotations/:id/approvals/:stepId/decide { action: approve|reject|return, comment }
export const decideApproval = (quotationId, stepId, action, comment) =>
  client.post(`/quotations/${quotationId}/approvals/${stepId}/decide`, { action, comment })
