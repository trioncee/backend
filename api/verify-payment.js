export const config = {
    api: {
        bodyParser: true,
    },
};

const crypto = require('crypto');
const { createShipment } = require('./create-shipment');

module.exports = async (req, res) => {

    if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    // CORS (you can restrict later)
    //res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            shipping_details   // 👈 coming from frontend
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment details' });
        }

        /* =========================
           1️⃣ Verify Razorpay Signature
           ========================= */
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(401).json({ error: 'Invalid payment signature' });
        }

        /* =========================
           2️⃣ Replay Protection
           ========================= */
        global.processedPayments ||= new Set();

        if (global.processedPayments.has(razorpay_payment_id)) {
            return res.status(409).json({ error: 'Payment already processed' });
        }

        global.processedPayments.add(razorpay_payment_id);

        /* =========================
           3️⃣ Auto Create Shipment
           ========================= */
        let shipment = null;
        let shipmentWarning = null;

        if (shipping_details) {
            try {
                const safeShippingDetails = {
                    order_id: razorpay_order_id,
                    name: shipping_details.name,
                    phone: shipping_details.phone,
                    email: shipping_details.email,
                    address: shipping_details.address,
                    city: shipping_details.city,
                    state: shipping_details.state,
                    pincode: shipping_details.pincode,
                    items: shipping_details.items,
                    total: shipping_details.total
                };

                shipment = await createShipment(safeShippingDetails);

            } catch (err) {
                console.error('Shiprocket shipment failed:', err.message);
                shipmentWarning = 'Payment successful, but shipment creation failed';
            }
        }

        /* =========================
           4️⃣ Final Response
           ========================= */
        return res.status(200).json({
            status: 'success',
            message: 'Payment verified successfully',
            payment_id: razorpay_payment_id,
            shipment,
            warning: shipmentWarning
        });

    } catch (err) {
        console.error('Verification error:', err.message);
        return res.status(500).json({ error: 'Verification failed' });
    }
};
