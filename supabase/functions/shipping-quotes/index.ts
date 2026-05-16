import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const body = await req.json()
    const { zip_to, total_items, order_id, action } = body
    
    // 1. Obtener Credenciales de Skydropx PRO
    const CLIENT_ID = Deno.env.get('SKYDROPX_CLIENT_ID')?.trim()
    const CLIENT_SECRET = Deno.env.get('SKYDROPX_CLIENT_SECRET')?.trim()
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error("Las credenciales SKYDROPX_CLIENT_ID o SKYDROPX_CLIENT_SECRET no están configuradas en Supabase.")
    }

    const baseUrl = 'https://pro.skydropx.com/api/v1'

    // 2. Generar Bearer Token (OAuth2)
    const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(`Skydropx PRO Auth Error: No se pudo generar el token Bearer. Revisa tus credenciales. Detalles: ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    const BEARER_TOKEN = tokenData.access_token

    // 3. Preparación de Datos de Origen (Creativity)
    const ORIGIN_DATA = {
      province: "Querétaro",
      city: "Querétaro",
      name: "Creativity Oficial",
      zip: "76000",
      country: "MX",
      address1: "Av. Constituyentes 123",
      company: "Creativity",
      address2: "Centro",
      phone: "4420000000",
      email: "contacto@creativity.mx"
    }

    // 4. Lógica Principal: CREAR ENVÍO
    if (action === 'create_shipment' && order_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data: order, error: orderError } = await supabase
        .from('ordenes')
        .select('*')
        .eq('id', order_id)
        .single()

      if (orderError) throw orderError

      const itemsCount = order.items ? order.items.reduce((acc: number, item: any) => acc + item.quantity, 0) : 1
      const weight = itemsCount > 50 ? 10 : itemsCount > 20 ? 5 : 2;

      const shipmentPayload = {
        shipment: {
          address_from: {
            country_code: "MX",
            postal_code: ORIGIN_DATA.zip,
            area_level1: ORIGIN_DATA.province,
            area_level2: ORIGIN_DATA.city,
            area_level3: ORIGIN_DATA.address2 || "Centro",
            street1: ORIGIN_DATA.address1,
            name: ORIGIN_DATA.name,
            company: ORIGIN_DATA.company,
            phone: ORIGIN_DATA.phone,
            email: ORIGIN_DATA.email
          },
          address_to: {
            country_code: "MX",
            postal_code: order.codigo_postal,
            area_level1: order.estado || order.cliente_direccion.split(',')[3]?.trim() || "Estado",
            area_level2: order.ciudad || order.cliente_direccion.split(',')[2]?.trim() || "Ciudad",
            area_level3: order.cliente_direccion.split(',')[1]?.trim() || "Colonia",
            street1: order.cliente_direccion.split(',')[0]?.trim() || "SN",
            name: order.cliente_nombre,
            company: "Cliente",
            phone: order.cliente_telefono || "0000000000",
            email: order.cliente_email
          },
          parcel: {
            weight: weight,
            length: 30,
            width: 20,
            height: 10
          }
        }
      }

      console.log('Sending PRO Shipment Payload:', JSON.stringify(shipmentPayload))

      const response = await fetch(`${baseUrl}/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEARER_TOKEN}`
        },
        body: JSON.stringify(shipmentPayload)
      })

      const result = await response.json()
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.ok ? 200 : 400,
      })
    }

    // 5. ACCIÓN: COTIZAR (DEFAULT)
    const weight = total_items && total_items > 50 ? 10 : total_items && total_items > 20 ? 5 : 2;

    const quotationPayload = {
      quotation: {
        address_from: {
          country_code: "MX",
          postal_code: ORIGIN_DATA.zip,
          area_level1: ORIGIN_DATA.province,
          area_level2: ORIGIN_DATA.city,
          area_level3: ORIGIN_DATA.address2 || "Centro"
        },
        address_to: {
          country_code: "MX",
          postal_code: zip_to,
          area_level1: "Estado", // In a real app we'd resolve this via zip
          area_level2: "Ciudad",
          area_level3: "Colonia"
        },
        parcel: {
          weight: weight,
          length: 30,
          width: 20,
          height: 10
        }
      }
    }

    console.log('Sending PRO Quotation Payload:', JSON.stringify(quotationPayload))

    const response = await fetch(`${baseUrl}/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEARER_TOKEN}`
      },
      body: JSON.stringify(quotationPayload)
    })

    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('Non-JSON Response from Skydropx PRO:', responseText)
      throw new Error(`Error de Skydropx: No se pudo cotizar el envío. Respuesta: ${responseText.substring(0, 50)}`)
    }

    if (!response.ok) {
      console.error('Skydropx PRO Error:', data)
      return new Response(JSON.stringify({ error: data.error || data.message || JSON.stringify(data) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    let quotationData = data;
    let attempts = 0;
    
    // Polling until the quotation is completed by Skydropx
    while (!quotationData.is_completed && attempts < 6) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const pollRes = await fetch(`${baseUrl}/quotations/${quotationData.id}`, {
        headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
      });
      if (pollRes.ok) {
        quotationData = await pollRes.json();
      }
      attempts++;
    }

    // Filter only successful rates
    if (quotationData.rates && Array.isArray(quotationData.rates)) {
      quotationData.rates = quotationData.rates.filter((r: any) => r.success === true);
    }

    return new Response(JSON.stringify(quotationData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Internal Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
