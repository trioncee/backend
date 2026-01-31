export const config = {
    api: {
        bodyParser: true,
    },
};

const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = async (req, res) => {
    if (!process.env.FRONTEND_URL) {
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    // CORS
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { amount, notes } = req.body;

        // Backend authority validation
        if (typeof amount !== 'number' || amount < 1 || amount > 500000) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Safe metadata only
        const safeNotes = {
            item_name: notes?.item_name,
            size: notes?.size,
            colour: notes?.colour,
            address: notes?.address,
            pincode: notes?.pincode,
        };

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: safeNotes,
        });

        return res.status(200).json(order);
    } catch (err) {
        console.error('Razorpay order creation failed:', err);
        return res.status(500).json({ error: 'Order creation failed' });
    }
};
