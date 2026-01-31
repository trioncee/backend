# Trioncee Backend

Complete, minimal backend for secure payments (Razorpay) and shipping automation (Shiprocket).

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Variables**
    Copy `.env.example` to `.env` and fill in your credentials:
    ```bash
    cp .env.example .env
    ```
    -   **Razorpay**: Dashboard -> Settings -> API Keys
    -   **Shiprocket**: Settings -> API -> Configure

## Deployment

### Vercel / Netlify
This project is designed with a serverless function structure in the `/api` directory.
-   **Vercel**: Simply import the project. Vercel automatically detects the `/api` folder.
-   **Netlify**: Similar auto-detection for Netlify Functions.

## API Endpoints

### 1. Create Order
**POST** `/api/create-order`
Creates a Razorpay order ID to start the payment flow on the frontend.
-   **Body**: `{ "amount": 100, "receipt": "order_rcptid_11", "notes": { ... } }`
    -   `amount`: Amount in **INR** (will be converted to paise automatically).

### 2. Verify Payment
**POST** `/api/verify-payment`
Verifies the payment signature and creates a Shiprocket shipment if successful.
-   **Body**:
    ```json
    {
      "razorpay_order_id": "order_...",
      "razorpay_payment_id": "pay_...",
      "razorpay_signature": "...",
      "shipping_details": { ... }
    }
    ```

## Security
-   API secrets are never exposed to the client.
-   Razorpay payments are verified server-side using HMAC SHA256.
-   Shiprocket tokens are managed internally.
