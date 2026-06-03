import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BIND_TOKEN = Deno.env.get('BIND_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!BIND_TOKEN) {
      throw new Error("El token BIND_TOKEN no está configurado en las variables de entorno de Supabase.")
    }

    const isWriteAction = req.method === 'POST';

    // 1. Consultar el catálogo completo de Bind ERP paginando los resultados
    const products: any[] = [];
    let nextUrl: string | null = 'https://api.bind.com.mx/api/Products';

    console.log("Iniciando consulta de catálogo en Bind ERP...");
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BIND_TOKEN}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error de la API de Bind ERP: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.value && Array.isArray(data.value)) {
        products.push(...data.value);
      }
      nextUrl = data.nextLink || null;
    }
    console.log(`Consulta completada. Se encontraron ${products.length} productos en Bind ERP.`);

    const inventoryMap: Record<string, number> = {};
    if (products.length > 0) {
      for (const product of products) {
        const key = (product.SKU || product.Code || '').trim();
        if (key) {
          inventoryMap[key] = product.CurrentInventory || 0;
        }
      }
    }

    let localInventory: any[] = [];
    let syncCount = 0;
    const updatedItemsList: any[] = [];

    // 2. Si es una solicitud POST, realizamos la actualización en la base de datos de Supabase
    if (isWriteAction) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Credenciales de base de datos no configuradas en el entorno de Supabase.")
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      console.log("Obteniendo catálogo de inventario local en Supabase...");
      const { data: invData, error: invError } = await supabase
        .from('inventario')
        .select('id, sku, stock');

      if (invError) {
        throw new Error(`Error obteniendo el inventario local: ${invError.message}`);
      }

      localInventory = invData || [];
      console.log(`Se encontraron ${localInventory.length} variantes locales en Supabase.`);

      console.log("Comparando y actualizando diferencias de existencias...");
      for (const item of localInventory) {
        const sku = (item.sku || '').trim();
        if (sku && inventoryMap[sku] !== undefined) {
          const bindStock = inventoryMap[sku];
          if (item.stock !== bindStock) {
            console.log(`Actualizando SKU ${sku} (ID: ${item.id}): Local DB ${item.stock} -> Bind ERP ${bindStock}`);
            
            const { error: updateError } = await supabase
              .from('inventario')
              .update({ stock: bindStock })
              .eq('id', item.id);

            if (updateError) {
              console.error(`Error actualizando item ${item.id} (SKU: ${sku}):`, updateError.message);
            } else {
              syncCount++;
              updatedItemsList.push({ id: item.id, sku, oldStock: item.stock, newStock: bindStock });
            }
          }
        }
      }
      console.log(`Sincronización finalizada. Se actualizaron ${syncCount} variantes de inventario.`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        isWriteAction,
        syncCount,
        updatedItemsCount: updatedItemsList.length,
        updatedItems: updatedItemsList,
        inventoryMap, 
        products,
        productsCount: products.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Bind Inventory Function Error:', error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
