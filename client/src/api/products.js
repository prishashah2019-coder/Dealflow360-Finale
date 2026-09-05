import client from './client'

// GET /api/products
export const getProducts = () => client.get('/products')
// POST /api/products
export const createProduct = (data) => client.post('/products', data)
// GET /api/products/:id
export const getProduct = (id) => client.get(`/products/${id}`)
// PUT /api/products/:id
export const updateProduct = (id, data) => client.put(`/products/${id}`, data)

// GET /api/warehouses
export const getWarehouses = () => client.get('/warehouses')
// POST /api/warehouses
export const createWarehouse = (data) => client.post('/warehouses', data)

// GET /api/stocks
export const getStocks = () => client.get('/stocks')

// GET /api/subscription-plans
export const getSubscriptionPlans = () => client.get('/subscription-plans')
// POST /api/subscription-plans
export const createSubscriptionPlan = (data) => client.post('/subscription-plans', data)

// GET /api/upsell/:productId
export const getUpsell = (productId) => client.get(`/upsell/${productId}`)

// GET /api/price-lists
export const getPriceLists = () => client.get('/price-lists')
