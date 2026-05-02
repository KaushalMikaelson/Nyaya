async function run() {
  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser99@gmail.com',
        password: 'password123'
      })
    });
    const login = await loginRes.json();
    if (!login.accessToken) {
      console.log("Login failed", login);
      return;
    }
    console.log("Logged in");

    const orderRes = await fetch('http://localhost:3001/api/payment/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${login.accessToken}`
      },
      body: JSON.stringify({ tier: 'PRO' })
    });
    const orderData = await orderRes.json();
    console.log("Order created:", orderData);

    const verifyRes = await fetch('http://localhost:3001/api/payment/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${login.accessToken}`
      },
      body: JSON.stringify({
        tier: 'PRO',
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: "pay_mock_" + Date.now(),
        razorpay_signature: "signature_mock"
      })
    });
    const verifyData = await verifyRes.json();
    console.log("Verify result:", verifyData);

  } catch (e) {
    console.log(e.message);
  }
}
run();
