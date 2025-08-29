require("dotenv").config();
const express = require("express");
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY in environment");
  process.exit(1);
}
const stripe = require("stripe")(STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

app.post("/payment", async (req, res) => {
  try {
    const { paymentMethodId, email, name } = req.body;
    if (!paymentMethodId) {
      return res.status(400).json({ message: "paymentMethodId is required" });
    }

    // 1) Find or create customer by email.
    let customer = null;
    if (email) {
      // Try to find an existing customer by email
      const search = await stripe.customers.search({
        query: `email:'${email.replace(/'/g, "\\'")}'`,
        limit: 1,
      });
      if (search.data.length > 0) {
        customer = search.data[0];
      }
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email: email || undefined,
        name: name || undefined,
        description: "Guest customer created at checkout",
      });
    }

    // 2) Attach the PaymentMethod to the customer
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });
    } catch (attachErr) {
      const alreadyAttached =
        attachErr && attachErr.code === "resource_already_exists";
      if (!alreadyAttached) {
        throw attachErr;
      }
    }

    // 3) Set as default payment method on the customer for future use.
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 4) Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 20 * 100,
      currency: "usd",
      customer: customer.id,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      receipt_email: email || undefined,
      metadata: {
        amount: 20 * 100,
        currency: "usd",
        customerId: customer.id,
        paymentIntentId: paymentIntent.id,
        paymentMethodId: paymentMethodId,
      },
    });

    if (
      paymentIntent.status === "requires_action" ||
      paymentIntent.status === "requires_source_action"
    ) {
      return res.status(200).json({
        message: "Additional authentication required",
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
        paymentIntentId: paymentIntent.id,
      });
    }

    res.status(201).json({
      message: "Payment successful",
      customerId: customer.id,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error("Payment error:", err);
    const msg =
      err && err.raw && err.raw.message
        ? err.raw.message
        : err.message || "Payment failed";
    res.status(500).json({ message: msg });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
