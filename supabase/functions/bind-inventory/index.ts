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

    const inventoryMap: Record<string, { id: string; stock: number }> = {};
    if (products.length > 0) {
      for (const product of products) {
        const key = (product.SKU || product.Code || '').trim();
        if (key) {
          inventoryMap[key] = {
            id: product.ID,
            stock: product.CurrentInventory || 0
          };
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

      // Identificar cuáles productos locales tienen SKU y coinciden con Bind ERP
      const matchedItems: any[] = [];
      for (const item of localInventory) {
        const sku = (item.sku || '').trim();
        if (sku && inventoryMap[sku] !== undefined) {
          matchedItems.push({
            id: item.id,
            sku: sku,
            oldStock: item.stock,
            bindId: inventoryMap[sku].id,
            bindStock: inventoryMap[sku].stock
          });
        }
      }

      console.log(`Iniciando sincronización detallada por almacén para ${matchedItems.length} variantes coincidentes...`);

      // Procesar consultas detalladas en lotes paralelos (concurrencia = 5) para optimizar rendimiento
      const concurrencyLimit = 5;
      for (let i = 0; i < matchedItems.length; i += concurrencyLimit) {
        const batch = matchedItems.slice(i, i + concurrencyLimit);
        
        await Promise.all(batch.map(async (item) => {
          try {
            // Consultar detalle individual del producto en Bind ERP
            const detailResponse = await fetch(`https://api.bind.com.mx/api/Products/${item.bindId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${BIND_TOKEN}`,
                'Accept': 'application/json'
              }
            });

            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              const inventories = detailData.Inventories || [];

              // 1. Limpiar los registros anteriores de almacenes para esta variante
              await supabase
                .from('inventario_almacenes')
                .delete()
                .eq('inventario_id', item.id);

              // 2. Si tiene inventario detallado por almacén, guardarlos
              if (inventories.length > 0) {
                const recordsToInsert = inventories.map((inv: any) => ({
                  inventario_id: item.id,
                  almacen_nombre: (inv.WarehouseName || '').trim(),
                  stock: inv.Inventory || 0
                }));

                const { error: insertError } = await supabase
                  .from('inventario_almacenes')
                  .insert(recordsToInsert);

                if (insertError) {
                  console.error(`Error guardando existencias por almacén para SKU ${item.sku}:`, insertError.message);
                }
              }

              // 3. Si el stock consolidado cambió, actualizar la tabla principal 'inventario'
              if (item.oldStock !== item.bindStock) {
                console.log(`Actualizando stock consolidado SKU ${item.sku}: Local ${item.oldStock} -> Bind ${item.bindStock}`);
                const { error: updateError } = await supabase
                  .from('inventario')
                  .update({ stock: item.bindStock })
                  .eq('id', item.id);

                if (updateError) {
                  console.error(`Error actualizando stock general de item ${item.id}:`, updateError.message);
                } else {
                  syncCount++;
                  updatedItemsList.push({ id: item.id, sku: item.sku, oldStock: item.oldStock, newStock: item.bindStock });
                }
              }
            } else {
              console.error(`Error de API de Bind obteniendo detalles de SKU ${item.sku}: ${detailResponse.status}`);
            }
          } catch (err) {
            console.error(`Fallo durante la sincronización de SKU ${item.sku}:`, err.message);
          }
        }));
      }
      
      console.log(`Sincronización de almacenes finalizada. Se actualizaron ${syncCount} variantes de stock general.`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        isWriteAction,
        syncCount,
        updatedItemsCount: updatedItemsList.length,
        updatedItems: updatedItemsList,
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
