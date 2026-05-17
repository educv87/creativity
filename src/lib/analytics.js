import { supabase } from './supabase';

// Generar o recuperar ID de sesión único y persistente para esta pestaña/sesión
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('creativity_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('creativity_session_id', sessionId);
  }
  return sessionId;
};

// Obtener información geográfica por IP una sola vez por sesión y guardarla en sessionStorage
const getGeoInfo = async () => {
  try {
    let geo = sessionStorage.getItem('creativity_geo_info');
    if (geo) return JSON.parse(geo);

    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      const geoData = {
        pais: data.country_name,
        estado: data.region,
        ciudad: data.city,
        ip: data.ip
      };
      sessionStorage.setItem('creativity_geo_info', JSON.stringify(geoData));
      return geoData;
    }
  } catch (e) {
    console.warn('No se pudo obtener geolocalización por IP:', e);
  }
  return null;
};

// Obtener tags UTM y referrer simplificado
const getTrafficSource = () => {
  const params = new URLSearchParams(window.location.search);
  const utms = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content')
  };
  
  let referrer = document.referrer;
  let parsedReferrer = 'Directo';
  if (referrer) {
    if (referrer.includes('facebook.com') || referrer.includes('fb.me')) parsedReferrer = 'Facebook';
    else if (referrer.includes('instagram.com') || referrer.includes('instagr.am')) parsedReferrer = 'Instagram';
    else if (referrer.includes('tiktok.com')) parsedReferrer = 'TikTok';
    else if (referrer.includes('google.com')) parsedReferrer = 'Google';
    else parsedReferrer = referrer;
  }

  return { utms, referrer: parsedReferrer };
};

/**
 * Registra un evento de interacción del usuario en la tabla 'eventos_analitica' de Supabase
 * @param {string} eventName Nombre del evento (ej: 'seleccionar_talla', 'agregar_carrito', 'cotizar_envio', etc.)
 * @param {object} eventData Datos o metadatos adicionales del evento (ej: { talla: 'M', cantidad: 5 })
 */
export const trackEvent = async (eventName, eventData = {}) => {
  try {
    const sessionId = getSessionId();
    const userAgent = navigator.userAgent;
    const urlPath = window.location.pathname;

    const geo = await getGeoInfo();
    const { utms, referrer } = getTrafficSource();

    // Enriquecer el payload del evento con datos geográficos y origen de tráfico
    const enrichedData = {
      ...eventData,
      _geo: geo,
      _traffic: {
        utms,
        referrer
      }
    };

    const { error } = await supabase
      .from('eventos_analitica')
      .insert([{
        session_id: sessionId,
        event_name: eventName,
        event_data: enrichedData,
        user_agent: userAgent,
        url_path: urlPath
      }]);

    if (error) {
      console.warn('Analytics logging error:', error);
    }
  } catch (err) {
    console.error('Failed to log analytics event:', err);
  }
};
