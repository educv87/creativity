import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const BIND_TOKEN = Deno.env.get('BIND_TOKEN')

    if (!BIND_TOKEN) {
      throw new Error("El token BIND_TOKEN no está configurado en las variables de entorno de Supabase.")
    }

    // Consultar el catálogo de Bind ERP
    const response = await fetch('https://api.bind.com.mx/api/Products', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BIND_TOKEN}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error de la API de Bind ERP: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    // Retornamos el catálogo. 
    const inventoryMap: Record<string, number> = {}
    const products = data.value || []
    if (products.length > 0) {
      for (const product of products) {
        if (product.SKU) {
          inventoryMap[product.SKU.trim()] = product.CurrentInventory || 0;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, inventoryMap, products }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Bind Inventory Function Error:', error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
