import { supabase } from './supabase';

export const fetchProjectData = async () => {
  try {
    const { data: cortesData } = await supabase.from('cortes').select('*').order('nombre');
    const { data: coloresData } = await supabase.from('colores').select('*').order('nombre');
    const { data: relationsData } = await supabase.from('corte_colores').select('*');
    const { data: inventarioData } = await supabase.from('inventario').select('*');

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

