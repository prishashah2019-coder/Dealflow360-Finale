const { Product, Warehouse, Stock, PriceList, DiscountConfig, SubscriptionPlan, UpsellRule, Customer, User } = require('../models');

// Customers (read-only here; sign-up happens via /api/auth/customer routes in a later iteration)
async function listCustomers(req, res) {
  res.json(await Customer.find().select('-passwordHash').sort({ name: 1 }));
}

// Internal users (for the Reports "Sales Team" filter, etc.)
async function listUsers(req, res) {
  res.json(await User.find().select('name role email').sort({ name: 1 }));
}

// Products
async function listProducts(req, res) {
  res.json(await Product.find().sort({ name: 1 }));
}
async function createProduct(req, res) {
  res.status(201).json(await Product.create(req.body));
}
async function getProduct(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });

  // Price lists live in their own collection (each one lists several
  // products), so the Product Detail screen's "Price Lists" table is built
  // by finding every price list that has an entry for this product.
  const priceLists = await PriceList.find({ 'items.productId': product._id });
  const plain = product.toObject();
  plain.priceLists = priceLists.map((pl) => {
    const item = pl.items.find((i) => String(i.productId) === String(product._id));
    const delta = item.price - product.basePrice;
    const priceRule = delta === 0 ? 'No adjustment'
      : `${delta > 0 ? '+' : '-'}$${Math.abs(delta)} vs base ($${item.price} total)`;
    return { tier: pl.customerTier, currency: pl.currency, priceRule };
  });

  res.json(plain);
}
async function updateProduct(req, res) {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
}

// Warehouses
async function listWarehouses(req, res) {
  res.json(await Warehouse.find().sort({ name: 1 }));
}
async function createWarehouse(req, res) {
  res.status(201).json(await Warehouse.create(req.body));
}

// Stock
async function listStocks(req, res) {
  const filter = {};
  if (req.query.productId) filter.productId = req.query.productId;
  if (req.query.warehouseId) filter.warehouseId = req.query.warehouseId;
  // Deliberately unpopulated: consumers (e.g. the Fulfillment screen) already
  // fetch /products and /warehouses separately and join client-side, so a raw
  // id here is what they expect - a populated object breaks that join.
  res.json(await Stock.find(filter));
}
async function upsertStock(req, res) {
  const { productId, warehouseId, qtyAvailable, replenishmentRule } = req.body;
  const stock = await Stock.findOneAndUpdate(
    { productId, warehouseId },
    { qtyAvailable, replenishmentRule },
    { new: true, upsert: true }
  );
  res.json(stock);
}

// Price lists
async function listPriceLists(req, res) {
  res.json(await PriceList.find());
}
async function createPriceList(req, res) {
  res.status(201).json(await PriceList.create(req.body));
}

// Discount config (tiers + category ceilings + approval chain rules)
async function getDiscountConfig(req, res) {
  let config = await DiscountConfig.findOne();
  if (!config) config = await DiscountConfig.create({});
  res.json(config);
}
async function putDiscountConfig(req, res) {
  let config = await DiscountConfig.findOne();
  if (!config) config = new DiscountConfig();
  Object.assign(config, req.body);
  await config.save();
  res.json(config);
}

// Subscription plans
async function listSubscriptionPlans(req, res) {
  res.json(await SubscriptionPlan.find());
}
async function createSubscriptionPlan(req, res) {
  res.status(201).json(await SubscriptionPlan.create(req.body));
}

// Upsell suggestions for a product
async function getUpsellForProduct(req, res) {
  const rules = await UpsellRule.find({ sourceProductId: req.params.productId })
    .populate('suggestedProductId')
    .sort({ isPromoted: -1, minMarginThreshold: -1 });
  res.json(
    rules.map((r) => ({
      _id: r._id, // stable id for the frontend to key/dismiss by - the rule has no other identity
      product: r.suggestedProductId,
      minMarginThreshold: r.minMarginThreshold,
      isPromoted: r.isPromoted,
    }))
  );
}

module.exports = {
  listCustomers, listUsers,
  listProducts, createProduct, getProduct, updateProduct,
  listWarehouses, createWarehouse,
  listStocks, upsertStock,
  listPriceLists, createPriceList,
  getDiscountConfig, putDiscountConfig,
  listSubscriptionPlans, createSubscriptionPlan,
  getUpsellForProduct,
};
