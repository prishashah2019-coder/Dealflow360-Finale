import client from './client'

// Fulfillment actions live under the quotation resource in the API contract
// (section 4). Re-exported here under the `fulfillment` module name so
// screens can import fulfillment-flavored calls from one place.

// POST /api/quotations/:id/fulfillment/suggest
export const suggestFulfillment = (quotationId) =>
  client.post(`/quotations/${quotationId}/fulfillment/suggest`)
// POST /api/quotations/:id/fulfillment/accept
export const acceptFulfillment = (quotationId) =>
  client.post(`/quotations/${quotationId}/fulfillment/accept`)
// POST /api/quotations/:id/fulfillment/override { splits: [...] }
export const overrideFulfillment = (quotationId, splits) =>
  client.post(`/quotations/${quotationId}/fulfillment/override`, { splits })

// GET /api/stocks -- used to render the warehouse stock table
export const getStocks = () => client.get('/stocks')
// GET /api/warehouses -- used to render warehouse names
export const getWarehouses = () => client.get('/warehouses')
// GET /api/quotations -- fulfillment list is derived from quotations with
// fulfillment-relevant statuses (Approved/Confirmed)
export const getQuotations = () => client.get('/quotations')
