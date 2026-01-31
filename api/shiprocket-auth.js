const axios = require('axios');

let cachedToken = null;
let tokenExpiry = null;

const getAuthToken = async () => {
    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
        throw new Error('Shiprocket credentials not configured');
    }

    // Return cached token if valid (5 min buffer)
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 5 * 60 * 1000) {
        return cachedToken;
    }

    try {
        const response = await axios.post(
            'https://apiv2.shiprocket.in/v1/external/auth/login',
            {
                email: process.env.SHIPROCKET_EMAIL,
                password: process.env.SHIPROCKET_PASSWORD,
            }
        );

        cachedToken = response.data.token;

        // Use expiry from response if available, else fallback
        const expiresIn = response.data.expires_in || 24 * 60 * 60;
        tokenExpiry = Date.now() + expiresIn * 1000;

        return cachedToken;
    } catch (err) {
        console.error('Shiprocket Auth Error:', err.message);
        cachedToken = null;
        tokenExpiry = null;
        throw new Error('Failed to authenticate with Shiprocket');
    }
};

module.exports = { getAuthToken };
