import client from './client'

// GET /api/credit-notes - finance/admin only
export const getCreditNotes = () => client.get('/credit-notes')
