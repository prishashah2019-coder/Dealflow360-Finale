import client from './client'

// POST /api/auth/signup { name, email, password, role }
export const signup = (data) => client.post('/auth/signup', data)

// POST /api/auth/login { email, password } -> { token, user }
export const login = (data) => client.post('/auth/login', data)

// POST /api/auth/customer/login { email, password } -> { token, customer }
export const customerLogin = (data) => client.post('/auth/customer/login', data)
