import client from './client'

// POST /api/auth/signup { name, email, password } -> { token, user }
// Always creates a sales_rep - public signup can't self-assign a higher role.
export const signup = (data) => client.post('/auth/signup', data)

// POST /api/auth/login { email, password } -> { token, user }
export const login = (data) => client.post('/auth/login', data)

// POST /api/auth/customer/signup { name, email, password, tier?, currency? } -> { token, customer }
export const customerSignup = (data) => client.post('/auth/customer/signup', data)

// POST /api/auth/customer/login { email, password } -> { token, customer }
export const customerLogin = (data) => client.post('/auth/customer/login', data)
