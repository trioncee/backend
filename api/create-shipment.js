const axios = require('axios');
const { getAuthToken } = require('./shiprocket-auth');

const createShipment = async (shippingDetails) => {
    if (
        !shippingDetails?.order_id ||
        !shippingDetails?.name ||
        !shippingDetails?.phone ||
        !shippingDetails?.address ||
        !shippingDetails?.pincode ||
        !Array.isArray(shippingDetails?.items)
    ) {
        throw new Error('Incomplete shipping details');
    }

    const token = await getAuthToken();

    const payload = {
        order_id: `SR_${shippingDetails.order_id}`,
        order_date: new Date().toISOString().slice(0, 16).replace('T', ' '), // Format: YYYY-MM-DD HH:MM
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',

        billing_customer_name: shippingDetails.name,
        billing_last_name: '',
        billing_address: shippingDetails.address,
        billing_address_2: shippingDetails.address_2 || '',
        billing_city: shippingDetails.city || '',
        billing_pincode: shippingDetails.pincode,
        billing_state: shippingDetails.state || '',
        billing_country: shippingDetails.country || 'India',
        billing_email: shippingDetails.email || 'no-reply@trioncee.com',
        billing_phone: shippingDetails.phone,

        shipping_is_billing: true,

        order_items: shippingDetails.items.map(item => ({
            name: item.name,
            sku: item.sku || 'default-sku',
            units: parseInt(item.quantity || item.units || 1),
            selling_price: parseFloat(item.verified_price || item.selling_price || item.price || 0),
            discount: '',
            tax: '',
            hsn: item.hsn || ''
        })),

        payment_method: 'Prepaid',
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,

        sub_total: parseFloat(shippingDetails.verified_total || 0),

        length: parseFloat(shippingDetails.length || 10),
        breadth: parseFloat(shippingDetails.breadth || 10),
        height: parseFloat(shippingDetails.height || 10),
        weight: parseFloat(shippingDetails.weight || 0.5)
    };

    try {
        const response = await axios.post(
            'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (err) {
        console.error('Shiprocket shipment failed:', err.message);
        throw new Error('Shipment creation failed');
    }
};

module.exports = { createShipment };
