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

export const fetchProjectData = async () => {
  try {
    const { data: cortesData } = await supabase.from('cortes').select('*').order('nombre');
    const { data: coloresData } = await supabase.from('colores').select('*').order('nombre');
    const { data: relationsData } = await supabase.from('corte_colores').select('*');
    const { data: inventarioData } = await supabase.from('inventario').select('*');

    // Mapeo en tiempo real con Bind ERP vía Edge Function
    const bindData = await fetchBindInventory();
    if (bindData && bindData.success && bindData.inventoryMap && inventarioData) {
      inventarioData.forEach(item => {
        if (item.sku && bindData.inventoryMap[item.sku.trim()] !== undefined) {
          item.stock = bindData.inventoryMap[item.sku.trim()];
        }
      });
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

