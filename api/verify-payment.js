export const config = {
    api: {
        bodyParser: true,
    },
};

const crypto = require('crypto');

module.exports = async (req, res) => {

    if (!process.env.FRONTEND_URL) {
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Credentials', true);
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
            razorpay_signature
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment details' });
        }

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(401).json({ error: 'Invalid payment signature' });
        }

        global.processedPayments ||= new Set();

        if (global.processedPayments.has(razorpay_payment_id)) {
            return res.status(409).json({ error: 'Payment already processed' });
        }

        global.processedPayments.add(razorpay_payment_id);

        return res.status(200).json({
            status: 'success',
            message: 'Payment verified successfully',
            payment_id: razorpay_payment_id
        });

    } catch (err) {
        console.error('Verification error:', err);
        return res.status(500).json({ error: 'Verification failed' });
    }
};
