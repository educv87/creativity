import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar pre-vuelo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { zip_to, total_items } = await req.json()
    const SKYDROPX_TOKEN = Deno.env.get('SKYDROPX_TOKEN')
    const ORIGIN_ZIP = '76000'

    // Estimación de dimensiones
    let dimensions = { length: 30, width: 20, height: 10, weight: 1 }
    if (total_items > 10 && total_items <= 50) {
      dimensions = { length: 40, width: 30, height: 20, weight: 5 }
    } else if (total_items > 50) {
      dimensions = { length: 60, width: 40, height: 30, weight: 12 }
    }

    const response = await fetch('https://api.skydropx.com/v1/quotations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token token=${SKYDROPX_TOKEN}`
      },
      body: JSON.stringify({
        zip_from: ORIGIN_ZIP,
        zip_to: zip_to,
        parcel: dimensions
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
