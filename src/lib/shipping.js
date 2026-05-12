const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Obtiene cotizaciones de envío a través de la Edge Function segura
 * @param {string} destinationZip CP del cliente
 * @param {number} totalItems Cantidad de prendas
 */
export const getShippingQuotes = async (destinationZip, totalItems) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/shipping-quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        zip_to: destinationZip,
        total_items: totalItems
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: true, message: data.error || 'Error al cotizar' };
    }

    // Adaptar el formato de Skydropx al de nuestra App
    return {
      success: true,
      options: data.map(opt => ({
        id: opt.id,
        name: opt.service_level_name || opt.provider,
        time: `${opt.days} días hábiles`,
        price: parseFloat(opt.total_pricing),
        logo: getProviderIcon(opt.provider)
      }))
    };
  } catch (error) {
    console.error('Edge Function Error:', error);
    return { error: true, message: 'El servidor de envíos aún no está desplegado o configurado.' };
  }
};

/**
 * Crea un envío (Shipment) en Skydropx
 * @param {string} orderId ID de la orden en Supabase
 */
export const createShipment = async (orderId) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/shipping-quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        order_id: orderId,
        action: 'create_shipment'
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Shipment Creation Error:', error);
    return { error: true, message: 'No se pudo crear la guía en Skydropx.' };
  }
};

const getProviderIcon = (provider) => {
  const icons = {
    'estafeta': '📦',
    'fedex': '🚀',
    'dhl': '🟡',
    'redpack': '🌿',
    'sendex': '🚚'
  };
  return icons[provider ? provider.toLowerCase() : ''] || '📦';
};

