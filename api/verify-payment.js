// Node crypto module for Razorpay signature verification
const crypto = require('crypto');

// Shiprocket import — COMMENTED for now
// We will enable this only after Razorpay flow is fully stable
// const { createShipment } = require('./create-shipment');

module.exports = async (req, res) => {

    // Ensure frontend URL is configured (CORS safety)
    if (!process.env.FRONTEND_URL) {
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    // CORS headers (restricted to your frontend)
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Only POST allowed
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Extract Razorpay callback details from frontend
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
            // shipping_details  <-- ignored for now
        } = req.body;

        // Basic validation
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment details' });
        }

        // STEP 1: Create the signature payload exactly as Razorpay expects
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;

        // STEP 2: Generate HMAC SHA256 signature using Razorpay secret
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        // STEP 3: Compare signatures
        if (expectedSignature !== razorpay_signature) {
            // If this fails → payment is NOT genuine
            return res.status(401).json({ error: 'Invalid payment signature' });
        }

        // STEP 4: Replay-attack protection (lightweight, in-memory)
        // Prevents same payment_id from being processed twice
        global.processedPayments ||= new Set();

        if (global.processedPayments.has(razorpay_payment_id)) {
            return res.status(409).json({ error: 'Payment already processed' });
        }

        global.processedPayments.add(razorpay_payment_id);

        /*
        =========================================================
        SHIPROCKET BLOCK — DISABLED FOR NOW
        =========================================================

        let shipmentData = null;
        let shipmentWarning = null;

        if (shipping_details) {
            try {
                const safeShippingDetails = {
                    order_id: razorpay_order_id,
                    name: shipping_details?.name,
                    phone: shipping_details?.phone,
                    address: shipping_details?.address,
                    pincode: shipping_details?.pincode,
                    city: shipping_details?.city,
                    state: shipping_details?.state,
                    items: shipping_details?.items
                };

                shipmentData = await createShipment(safeShippingDetails);
            } catch (err) {
                shipmentWarning = 'Payment verified, shipping creation failed';
                console.error('Shiprocket error:', err.message);
            }
        }
        */

        // STEP 5: Return success response (Razorpay only)
        res.status(200).json({
            status: 'success',
            message: 'Payment verified successfully',
            payment_id: razorpay_payment_id
            // shipment: null
        });

    } catch (err) {
        console.error('Verification error:', err.message);
        res.status(500).json({ error: 'Verification failed' });
    }
};
