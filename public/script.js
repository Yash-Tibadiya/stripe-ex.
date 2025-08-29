const stripe = Stripe(
  "pk_test_51RlpX1QjhiNa6FtXBK1vbrwUhQmbfs7pg1OKWwQGogZq4eR3L92ILGCnE2XVYEJpyafRO2DQtZwhV3HgFJ1nlpii00EBeEHZ7F"
);
const elements = stripe.elements({
  fonts: [
    {
      cssSrc:
        "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap",
    },
  ],
});

const cardNumberElement = elements.create("cardNumber", {
  style: {
    base: {
      color: "#212121",
      fontWeight: "600",
      fontFamily: "Montserrat, sans-serif",
      fontSmoothing: "antialiased",
      fontSize: "18px",
      "::placeholder": {
        color: "#ccc",
      },
    },
  },
});
cardNumberElement.mount("#card-number-element");

const cardExpiryElement = elements.create("cardExpiry", {
  style: {
    base: {
      color: "#212121",
      fontWeight: "600",
      fontFamily: "Montserrat, sans-serif",
      fontSmoothing: "antialiased",
      fontSize: "18px",
      "::placeholder": {
        color: "#ccc",
      },
    },
  },
});
cardExpiryElement.mount("#card-expiry-element");

const cardCvcElement = elements.create("cardCvc", {
  style: {
    base: {
      color: "#212121",
      fontWeight: "600",
      fontFamily: "Montserrat, sans-serif",
      fontSmoothing: "antialiased",
      fontSize: "18px",
      "::placeholder": {
        color: "#ccc",
      },
    },
  },
});
cardCvcElement.mount("#card-cvc-element");

const cardholderNameElement = document.getElementById("cardholder-name");
const cardholderEmailElement = document.getElementById("cardholder-email");
const cardholderZipElement = document.getElementById("cardholder-zip");
const cardButton = document.getElementById("card-button");
const cardResult = document.getElementById("card-result");

// Error containers
const errorName = document.getElementById("error-name");
const errorEmail = document.getElementById("error-email");
const errorZip = document.getElementById("error-zip");

// Simple validators
const isNonEmpty = (v) => String(v || "").trim().length > 0;
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const isZip = (v) => /^[0-9]{4,10}$/.test(String(v || "").trim());

// Live validation hooks
const show = (el, msg) => (el.textContent = msg || "");
const clearAllErrors = () => {
  show(errorName, "");
  show(errorEmail, "");
  show(errorZip, "");
  cardResult.textContent = "";
};

cardholderNameElement.addEventListener("input", () => {
  show(errorName, isNonEmpty(cardholderNameElement.value) ? "" : "Name is required");
});
cardholderEmailElement.addEventListener("input", () => {
  const v = cardholderEmailElement.value;
  show(
    errorEmail,
    !isNonEmpty(v) ? "Email is required" : isEmail(v) ? "" : "Enter a valid email"
  );
});
cardholderZipElement.addEventListener("input", () => {
  const v = cardholderZipElement.value;
  show(errorZip, !isNonEmpty(v) ? "Zip is required" : isZip(v) ? "" : "Zip must be 4-10 digits");
});

cardButton.addEventListener("click", async () => {
  clearAllErrors();

  // Client-side required validation
  let hasError = false;

  if (!isNonEmpty(cardholderNameElement.value)) {
    show(errorName, "Name is required");
    hasError = true;
  }
  if (!isNonEmpty(cardholderEmailElement.value)) {
    show(errorEmail, "Email is required");
    hasError = true;
  } else if (!isEmail(cardholderEmailElement.value)) {
    show(errorEmail, "Enter a valid email");
    hasError = true;
  }
  if (!isNonEmpty(cardholderZipElement.value)) {
    show(errorZip, "Zip is required");
    hasError = true;
  } else if (!isZip(cardholderZipElement.value)) {
    show(errorZip, "Zip must be 4-10 digits");
    hasError = true;
  }

  if (hasError) {
    return;
  }

  cardResult.textContent = "Processing...";
  cardButton.disabled = true;

  const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: "card",
    card: cardNumberElement,
    billing_details: {
      name: cardholderNameElement.value.trim(),
      email: cardholderEmailElement.value.trim(),
      address: { postal_code: cardholderZipElement.value.trim() },
    },
  });

  if (error) {
    cardResult.textContent = error.message;
    cardButton.disabled = false;
    return;
  }

  const response = await fetch("/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentMethodId: paymentMethod.id,
      email: cardholderEmailElement.value.trim(),
      name: cardholderNameElement.value.trim(),
    }),
  });

  const data = await response.json();

  // If server indicates additional authentication is required, handle it client-side
  if (data.requiresAction && data.clientSecret) {
    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
      data.clientSecret
    );
    if (confirmError) {
      cardResult.textContent = confirmError.message || "Authentication failed";
      cardButton.disabled = false;
      return;
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      cardResult.textContent = "Payment successful";
    } else {
      cardResult.textContent = "Payment processing completed with unexpected status";
    }
  } else {
    cardResult.textContent = data.message;
  }

  // Clear inputs after finishing flow
  cardNumberElement.clear();
  cardExpiryElement.clear();
  cardCvcElement.clear();
  cardholderNameElement.value = "";
  cardholderEmailElement.value = "";
  cardholderZipElement.value = "";

  // Re-enable button
  cardButton.disabled = false;
});

cardNumberElement.on("change", (event) => {
  document.getElementById(
    "card-number-element"
  ).style.backgroundImage = `url(images/${event.brand}.png)`;
});
