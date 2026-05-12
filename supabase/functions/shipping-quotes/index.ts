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
    const { zip_to, total_items, order_id, action } = await req.json()
    const SKYDROPX_TOKEN = Deno.env.get('SKYDROPX_TOKEN')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Datos de Remitente (Creativity)
    const ORIGIN_DATA = {
      name: "Creativity Queretaro",
      phone: "4420000000",
      email: "contacto@creativity.mx",
      street_number: "123",
      street_name: "Av. Constituyentes",
      neighborhood: "Centro",
      city: "Querétaro",
      province: "Querétaro",
      zip: "76000",
      country: "MX"
    }

    // ACCIÓN: CREAR ENVÍO (POST-PAGO)
    if (action === 'create_shipment' && order_id) {
      const { data: order, error: orderError } = await supabase
        .from('ordenes')
        .select('*')
        .eq('id', order_id)
        .single()

      if (orderError) throw orderError

      // Estimar dimensiones
      let dimensions = { length: 30, width: 20, height: 10, weight: 1 }
      if (order.items.length > 10) dimensions = { length: 40, width: 30, height: 20, weight: 5 }

      const response = await fetch('https://api.skydropx.com/v1/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token token=${SKYDROPX_TOKEN}`
        },
        body: JSON.stringify({
          address_from: ORIGIN_DATA,
          address_to: {
            name: order.cliente_nombre,
            phone: order.cliente_telefono,
            email: order.cliente_email,
            street_number: order.cliente_direccion.split(',')[0] || "SN",
            street_name: order.cliente_direccion || "Direccion",
            neighborhood: order.cliente_direccion.split(',')[1] || "Centro",
            city: order.cliente_direccion.split(',')[2] || "Ciudad",
            province: order.cliente_direccion.split(',')[3] || "Estado",
            zip: order.codigo_postal,
            country: "MX"
          },
          parcels: [dimensions]
        })
      })

      const result = await response.json()
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ACCIÓN: COTIZAR (DEFAULT)
    const response = await fetch('https://api.skydropx.com/v1/quotations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token token=${SKYDROPX_TOKEN}`
      },
      body: JSON.stringify({
        zip_from: ORIGIN_DATA.zip,
        zip_to: zip_to,
        parcel: { length: 30, width: 20, height: 10, weight: 1 }
      })
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.ok ? 200 : 400,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
