const Razorpay = require('razorpay');
const rzp = new Razorpay({
  key_id: 'rzp_test_SkSTmClMQ5Y9lz',
  key_secret: 'lEV1vhHrRbG2V8xSgtY00jj8'
});
rzp.orders.create({ amount: 100, currency: 'INR', receipt: 'test_receipt_001' })
  .then(o => console.log('✅ Keys valid! Order ID:', o.id))
  .catch(e => console.error('❌ Key error:', e.error?.description || e.message));
