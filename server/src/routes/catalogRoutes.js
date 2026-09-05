const express = require('express');
const { requireAuth, requireInternal, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/catalogController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/customers', ctrl.listCustomers);
router.get('/users', ctrl.listUsers);
router.post('/users', requireRole('admin'), ctrl.createUser);
router.get('/audit-log', requireRole('admin'), ctrl.listAuditLog);

router.get('/products', ctrl.listProducts);
router.post('/products', requireRole('admin'), ctrl.createProduct);
router.get('/products/:id', ctrl.getProduct);
router.put('/products/:id', requireRole('admin'), ctrl.updateProduct);

router.get('/warehouses', ctrl.listWarehouses);
router.post('/warehouses', requireRole('admin'), ctrl.createWarehouse);

router.get('/stocks', ctrl.listStocks);
router.put('/stocks', requireRole('admin', 'finance'), ctrl.upsertStock);

router.get('/price-lists', ctrl.listPriceLists);
router.post('/price-lists', requireRole('admin'), ctrl.createPriceList);

router.get('/discount-config', ctrl.getDiscountConfig);
// Per the problem statement, Sales Manager (not just Admin) "configures
// discount tiers and approval chains".
router.put('/discount-config', requireRole('admin', 'sales_manager'), ctrl.putDiscountConfig);

router.get('/subscription-plans', ctrl.listSubscriptionPlans);
router.post('/subscription-plans', requireRole('admin'), ctrl.createSubscriptionPlan);

router.get('/upsell/:productId', ctrl.getUpsellForProduct);

module.exports = router;
