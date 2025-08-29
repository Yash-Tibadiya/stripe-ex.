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

cardButton.addEventListener("click", async () => {
  cardResult.textContent = "Processing...";
  cardButton.disabled = true;

  const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: "card",
    card: cardNumberElement,
    billing_details: {
      name: cardholderNameElement.value,
      email: cardholderEmailElement.value,
      address: { postal_code: cardholderZipElement.value },
    },
  });

  if (error) {
    cardResult.textContent = error.message;
  } else {
    const response = await fetch("/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id,
        email: cardholderEmailElement.value || undefined,
        name: cardholderNameElement.value || undefined,
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
  }
});

cardNumberElement.on("change", (event) => {
  document.getElementById(
    "card-number-element"
  ).style.backgroundImage = `url(images/${event.brand}.png)`;
});
