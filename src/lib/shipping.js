const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Obtiene cotizaciones de envío a través de la Edge Function segura
 * @param {string} destinationZip CP del cliente
 * @param {number} totalItems Cantidad de prendas
 */
export const getShippingQuotes = async (destinationZip, totalItems) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, message: 'Faltan credenciales de Supabase.' };
  }

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
      console.error('API Error Response:', data);
      let errorMsg = 'Error al cotizar';
      
      if (typeof data.error === 'string' && data.error.includes('{')) {
        try {
          const parsed = JSON.parse(data.error);
          if (parsed.errors && parsed.errors.address_to) {
            errorMsg = 'El código postal ingresado no es válido o no existe.';
          } else {
            errorMsg = parsed.message || data.error;
          }
        } catch (e) {
          errorMsg = data.error;
        }
      } else {
        errorMsg = data.error || data.message || errorMsg;
      }
      
      return { success: false, message: errorMsg };
    }

    // Extraer rates robustamente
    let rates = data;
    if (!Array.isArray(data)) {
      if (data.rates) rates = data.rates;
      else if (data.data?.attributes?.rates) rates = data.data.attributes.rates;
      else if (data.data && Array.isArray(data.data)) rates = data.data.map(r => ({ id: r.id, ...r.attributes }));
    }

    if (!Array.isArray(rates)) {
      console.error('Invalid rates format received:', data);
      return { success: false, message: 'La respuesta de envío no es válida.' };
    }

    if (rates.length === 0) {
       return { success: true, options: [] }; // Se maneja en el frontend como "No se encontraron paqueterías"
    }

    // Adaptar el formato de Skydropx al de nuestra App
    return {
      success: true,
      options: rates.map(opt => ({
        id: opt.id,
        name: opt.provider_display_name || opt.provider_name || 'Paquetería',
        time: opt.days ? `${opt.days} días hábiles` : 'Estándar',
        price: parseFloat(opt.total || opt.amount || 0),
        logo: getProviderIcon(opt.provider_name)
      }))
    };
  } catch (error) {
    console.error('Edge Function Error:', error);
    return { success: false, message: 'El servidor de envíos no respondió correctamente.' };
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

