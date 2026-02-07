// api/shiprocket-track.js
const axios = require('axios');
const { getAuthToken } = require('./shiprocket-auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const awb = req.query.awb;
    if (!awb) {
        return res.status(400).json({ error: 'AWB is required' });
    }

    try {
        // DEV MODE MOCK (important – avoids cost)
        if (process.env.NODE_ENV !== 'production') {
            return res.json({
                status: 'In Transit',
                current_location: 'Hyderabad',
                expected_delivery: '2 days'
            });
        }

        const token = await getAuthToken();

        const response = await axios.get(
            `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Send only what frontend needs
        res.json({
            status: response.data.tracking_data?.shipment_status,
            history: response.data.tracking_data?.shipment_track
        });

    } catch (err) {
        console.error('Tracking error:', err.message);
        res.status(500).json({ error: 'Unable to fetch tracking details' });
    }
};
