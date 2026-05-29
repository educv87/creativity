import { supabase } from './supabase';

export const fetchBindInventory = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('bind-inventory');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching bind inventory:', err);
    return { success: false };
  }
};

export const fetchProjectData = async (skipBind = true) => {
  try {
    const { data: cortesData } = await supabase.from('cortes').select('*').order('nombre');
    const { data: coloresData } = await supabase.from('colores').select('*').order('nombre');
    const { data: relationsData } = await supabase.from('corte_colores').select('*');
    const { data: inventarioData } = await supabase.from('inventario').select('*');

    // Mapeo en tiempo real con Bind ERP (solo si se solicita explícitamente, ej. en depuraciones)
    if (!skipBind) {
      const bindData = await fetchBindInventory();
      if (bindData && bindData.success && inventarioData) {
        const products = bindData.products || [];
        const inventoryMap = {};
        products.forEach(p => {
          const key = (p.SKU || p.Code || '').trim();
          if (key) {
            inventoryMap[key] = p.CurrentInventory || 0;
          }
        });

        inventarioData.forEach(item => {
          if (item.sku && inventoryMap[item.sku.trim()] !== undefined) {
            item.stock = inventoryMap[item.sku.trim()];
          }
        });
      }
    }

    return {
      cortes: cortesData || [],
      colores: coloresData || [],
      relations: relationsData || [],
      inventario: inventarioData || []
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
};

export const updateStock = async (id, newStock) => {
  const { error } = await supabase
    .from('inventario')
    .update({ stock: newStock })
    .eq('id', id);
  return { error };
};

export const updatePrice = async (id, newPrice) => {
  const { error } = await supabase
    .from('inventario')
    .update({ precio_unitario: newPrice })
    .eq('id', id);
  return { error };
};

export const updateDiscount = async (id, newDiscount) => {
  const { error } = await supabase
    .from('inventario')
    .update({ descuento_porcentaje: newDiscount })
    .eq('id', id);
  return { error };
};

export const updateSku = async (id, newSku) => {
  const { error } = await supabase
    .from('inventario')
    .update({ sku: newSku })
    .eq('id', id);
  return { error };
};

export const updateInventarioItem = async (id, updates) => {
  const { error } = await supabase
    .from('inventario')
    .update(updates)
    .eq('id', id);
  return { error };
};



export const addColor = async (color) => {
  const { data, error } = await supabase
    .from('colores')
    .insert([color])
    .select();
  return { data, error };
};

export const deleteColor = async (id) => {
  const { error } = await supabase
    .from('colores')
    .delete()
    .eq('id', id);
  return { error };
};

export const fetchOrders = async () => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

// --- Funciones para Objetivos de IA ---

export const fetchObjectives = async () => {
  try {
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      // Ignoramos el error de que la tabla no existe por si aún no se corre el SQL
      console.warn('Error fetching objectives (table might not exist yet):', error.message);
      return { data: [] };
    }
    return { data };
  } catch (err) {
    return { data: [] };
  }
};

export const addObjective = async (objective) => {
  const { data, error } = await supabase
    .from('objectives')
    .insert([objective])
    .select();
  return { data, error };
};

export const updateObjectiveStatus = async (id, status) => {
  const { error } = await supabase
    .from('objectives')
    .update({ status })
    .eq('id', id);
  return { error };
};

export const deleteObjective = async (id) => {
  const { error } = await supabase
    .from('objectives')
    .delete()
    .eq('id', id);
  return { error };
};

