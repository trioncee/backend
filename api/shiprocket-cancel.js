// api/shiprocket-cancel.js
const axios = require('axios');
const { getAuthToken } = require('./shiprocket-auth');

const CANCELLABLE_STATUSES = [
    'NEW',
    'AWB_ASSIGNED',
    'LABEL_GENERATED'
];

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { awb, order_id } = req.body;
    if (!awb || !order_id) {
        return res.status(400).json({ error: 'awb and order_id required' });
    }

    try {
        const token = await getAuthToken();

        // 1️⃣ Get real-time status
        const trackRes = await axios.get(
            `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        const status =
            trackRes.data?.tracking_data?.shipment_status;

        // 2️⃣ Check if cancellable
        if (!CANCELLABLE_STATUSES.includes(status)) {
            return res.status(409).json({
                error: 'Order cannot be cancelled at this stage',
                current_status: status
            });
        }

        // 3️⃣ Cancel order
        const cancelRes = await axios.post(
            'https://apiv2.shiprocket.in/v1/external/orders/cancel',
            { ids: [order_id] },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            status: 'cancelled',
            shiprocket_status: status,
            response: cancelRes.data
        });

    } catch (err) {
        console.error('Cancel error:', err.message);
        res.status(500).json({ error: 'Cancel failed' });
    }
};