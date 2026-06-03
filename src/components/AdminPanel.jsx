import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchProjectData, updateStock, updatePrice, addColor, deleteColor, fetchOrders, updateDiscount, updateSku, updateInventarioItem, fetchBindInventory, fetchObjectives, addObjective, updateObjectiveStatus, deleteObjective, addEscala, updateEscala, deleteEscala } from '../lib/data';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventario');
  const [data, setData] = useState({ cortes: [], colores: [], inventario: [], escalas: [], ventasTableExists: true });
  const [orders, setOrders] = useState([]);
  const [editEscalasDraft, setEditEscalasDraft] = useState({});
  const [newEscala, setNewEscala] = useState({ min_qty: '', max_qty: '', precio: '' });
  const [isSavingEscalas, setIsSavingEscalas] = useState(false);
  const [newColor, setNewColor] = useState({ nombre: '', hex: '#ffffff', tint_class: 'bg-white' });
  const [saveStatus, setSaveStatus] = useState({}); // { id: 'success' | 'error' | 'saving' }
  const [filterCorte, setFilterCorte] = useState('all');
  const [filterColor, setFilterColor] = useState('all');
  const [editDraft, setEditDraft] = useState({}); // { id: { stock, price, discount, sku } }
  const [newCorte, setNewCorte] = useState({ nombre: '', imagen_url: '' });
  const [selectedColors, setSelectedColors] = useState([]); // Para el nuevo producto
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [bindProducts, setBindProducts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [filterOrderStatus, setFilterOrderStatus] = useState('all'); // 'all' | 'pagado' | 'pendiente'
  const [objectives, setObjectives] = useState([]);
  const [newObjective, setNewObjective] = useState({ title: '', description: '', status: 'pending' });

  // CSV / Excel Import states
  const [selectedFileName, setSelectedFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [importMapping, setImportMapping] = useState({ fecha: '', sku: '', cantidad: '', total: '', sucursal: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusMessage, setImportStatusMessage] = useState('');
  const [xlsParsingError, setXlsParsingError] = useState(null);
  const [importErrors, setImportErrors] = useState([]);




  useEffect(() => {
    checkSession();
  }, []);

  const fetchBindProducts = async () => {
    try {
      const bindData = await fetchBindInventory();
      if (bindData && bindData.success && bindData.products) {
        setBindProducts(bindData.products);
      }
    } catch (e) {
      console.error('Error fetching Bind products:', e);
    }
  };

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No active session, but bypass redirect to allow local testing.');
      loadAllData();
      fetchBindProducts();
    } else {
      loadAllData();
      fetchBindProducts();
    }
  };

  const loadAllData = async () => {
    const [result, ordersResult, objectivesResult] = await Promise.all([
      fetchProjectData(),
      fetchOrders(),
      fetchObjectives()
    ]);
    
    if (result) {
      setData(result);
      const initialDraft = {};
      result.inventario.forEach(item => {
        initialDraft[item.id] = {
          stock: item.stock,
          price: item.precio_unitario,
          discount: item.descuento_porcentaje || 0,
          sku: item.sku || ''
        };
      });
      setEditDraft(initialDraft);

      const initialEscalasDraft = {};
      (result.escalas || []).forEach(escala => {
        initialEscalasDraft[escala.id] = {
          min_qty: escala.min_qty,
          max_qty: escala.max_qty !== null && escala.max_qty !== undefined ? escala.max_qty : '',
          precio: escala.precio
        };
      });
      setEditEscalasDraft(initialEscalasDraft);
    }
    if (ordersResult.data) setOrders(ordersResult.data);
    if (objectivesResult.data) setObjectives(objectivesResult.data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const loadXlsxLibrary = () => {
    return new Promise((resolve, reject) => {
      if (window.XLSX) {
        resolve(window.XLSX);
        return;
      }
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.onload = () => resolve(window.XLSX);
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  };

  const cleanAndFormatDate = (val) => {
    if (!val) return null;
    
    // Check Excel serial number
    const num = parseFloat(val);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      const jsDate = new Date((num - 25569) * 86400 * 1000);
      return jsDate.toISOString().split('T')[0];
    }

    const str = String(val).trim();
    
    // Try DD/MM/YYYY or YYYY-MM-DD by splitting
    const parts = str.includes('/') ? str.split('/') : str.split('-');
    if (parts.length === 3) {
      // Check if it is YYYY-MM-DD
      if (parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
      // Check if it is DD/MM/YYYY
      if (parts[2].length === 4) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    // Try standard JS Date parsing
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch(e){}

    return null;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setXlsParsingError(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setImportStatusMessage('');
    setImportErrors([]);
    
    try {
      const XLSX = await loadXlsxLibrary();
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const dataBytes = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(dataBytes, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Get raw rows
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (rawRows.length === 0) {
            setXlsParsingError("El archivo está vacío.");
            return;
          }
          
          // Extract headers and clean empty rows
          const headers = (rawRows[0] || []).map(h => (h !== null && h !== undefined ? h : '').toString().trim());
          const rows = rawRows.slice(1).filter(r => r && r.some(cell => cell !== null && cell !== undefined && cell !== ''));
          
          setCsvHeaders(headers);
          setCsvRows(rows);
          
          // Smart auto-detection
          const mapping = { fecha: '', sku: '', cantidad: '', total: '', sucursal: '' };
          headers.forEach((h) => {
            const lowH = h.toLowerCase();
            if (lowH.includes('emisión') || lowH.includes('fecha') || lowH.includes('date') || lowH.includes('emision')) {
              mapping.fecha = h;
            } else if (lowH.includes('código prod/serv') || lowH.includes('sku') || lowH.includes('codigo') || lowH.includes('code') || lowH.includes('producto') || lowH.includes('artículo') || lowH.includes('articulo')) {
              mapping.sku = h;
            } else if (lowH.includes('cantidad') || lowH.includes('cant') || lowH.includes('qty') || lowH.includes('piezas') || lowH.includes('unidades')) {
              mapping.cantidad = h;
            } else if (lowH.includes('total') || lowH.includes('monto') || lowH.includes('importe') || lowH.includes('total factura') || lowH.includes('neto')) {
              mapping.total = h;
            } else if (lowH.includes('almacén') || lowH.includes('almacen') || lowH.includes('sucursal') || lowH.includes('warehouse') || lowH.includes('tienda')) {
              mapping.sucursal = h;
            }
          });
          
          setImportMapping(mapping);
        } catch (err) {
          console.error("Error parsing sheet:", err);
          setXlsParsingError("Error al procesar el archivo Excel/CSV: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Error loading SheetJS:", err);
      setXlsParsingError("No se pudo cargar el motor lector de Excel. Verifica tu conexión a internet.");
    }
  };

  const handleStartImport = async () => {
    if (!importMapping.fecha || !importMapping.sku || !importMapping.total || !importMapping.sucursal) {
      alert("Por favor mapea las columnas obligatorias: Fecha, SKU, Total y Sucursal.");
      return;
    }
    
    setIsImporting(true);
    setImportProgress(0);
    setImportStatusMessage("Procesando y validando filas...");
    setImportErrors([]);
    
    const fechaIdx = csvHeaders.indexOf(importMapping.fecha);
    const skuIdx = csvHeaders.indexOf(importMapping.sku);
    const cantIdx = importMapping.cantidad ? csvHeaders.indexOf(importMapping.cantidad) : -1;
    const totalIdx = csvHeaders.indexOf(importMapping.total);
    const sucIdx = csvHeaders.indexOf(importMapping.sucursal);
    
    const rowsToInsert = [];
    const errors = [];
    
    csvRows.forEach((row, index) => {
      const rawFecha = row[fechaIdx];
      const rawSku = row[skuIdx];
      const rawCant = cantIdx !== -1 ? row[cantIdx] : 1;
      const rawTotal = row[totalIdx];
      const rawSuc = row[sucIdx];
      
      // Skip empty or header rows duplicated
      if (rawFecha === undefined && rawSku === undefined && rawTotal === undefined) return;
      
      const formattedFecha = cleanAndFormatDate(rawFecha);
      if (!formattedFecha) {
        errors.push(`Fila ${index + 2}: Fecha inválida (${rawFecha || 'vacía'})`);
        return;
      }
      
      const sku = String(rawSku || '').trim();
      if (!sku) {
        errors.push(`Fila ${index + 2}: SKU/Código de producto vacío`);
        return;
      }
      
      // Clean and parse quantity
      const cantStr = String(rawCant || '1').replace(/[^0-9\.\-]/g, '');
      const cantidad = Math.round(parseFloat(cantStr)) || 1;
      
      // Clean and parse total (removes $, commas, etc.)
      const totalStr = String(rawTotal || '0').replace(/[^0-9\.\-]/g, '');
      const total = parseFloat(totalStr) || 0;
      
      const sucursal = String(rawSuc || 'Sucursal General').trim();
      
      rowsToInsert.push({
        fecha: formattedFecha,
        sku: sku,
        cantidad: cantidad,
        total: total,
        sucursal: sucursal
      });
    });
    
    if (errors.length > 0) {
      setImportErrors(errors);
    }
    
    if (rowsToInsert.length === 0) {
      setIsImporting(false);
      setImportProgress(0);
      setImportStatusMessage(`Error: No se encontraron filas válidas para importar. Revisa las advertencias.`);
      return;
    }
    
    const batchSize = 100;
    const totalBatches = Math.ceil(rowsToInsert.length / batchSize);
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = start + batchSize;
      const batch = rowsToInsert.slice(start, end);
      
      setImportStatusMessage(`Importando lote ${i + 1} de ${totalBatches}...`);
      
      const { error } = await supabase
        .from('ventas_sucursales')
        .insert(batch);
        
      if (error) {
        console.error(`Error importing batch ${i + 1}:`, error);
        failCount += batch.length;
      } else {
        successCount += batch.length;
      }
      
      setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
    }
    
    setIsImporting(false);
    setImportStatusMessage(`Carga completada. Se importaron ${successCount} registros con éxito. Fallidos: ${failCount}.`);
    
    // Clean states
    setCsvHeaders([]);
    setCsvRows([]);
    setSelectedFileName('');
    
    // Reload database states
    loadAllData();
  };

  const handleClearHistory = async () => {
    if (window.confirm("¿Seguro que deseas eliminar TODOS los registros del histórico de ventas? Esta acción no se puede deshacer y borrará los datos actuales para que puedas volver a subir el archivo corregido.")) {
      setLoading(true);
      const { error } = await supabase.from('ventas_sucursales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        alert("Error al limpiar historial: " + error.message);
      } else {
        alert("Historial de ventas eliminado correctamente.");
        loadAllData();
      }
      setLoading(false);
    }
  };

  const handleCreateObjective = async () => {
    if (!newObjective.title || !newObjective.description) {
      alert('Por favor, completa el título y la descripción.');
      return;
    }
    setLoading(true);
    const { error } = await addObjective(newObjective);
    if (error) {
      alert('Error al crear objetivo: ' + error.message);
    } else {
      setNewObjective({ title: '', description: '', status: 'pending' });
      await loadAllData();
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, status) => {
    setLoading(true);
    await updateObjectiveStatus(id, status);
    await loadAllData();
    setLoading(false);
  };

  const handleDeleteObjective = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este objetivo?')) {
      setLoading(true);
      await deleteObjective(id);
      await loadAllData();
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (orderId) => {
    if (window.confirm('¿Seguro que deseas marcar este pedido como pagado manualmente? Esto también intentará crear la guía de envío en Skydropx.')) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('ordenes')
          .update({ status: 'pagado' })
          .eq('id', orderId);
        
        if (error) throw error;
        
        try {
          const { createShipment } = await import('../lib/shipping');
          const res = await createShipment(orderId);
          if (res.error) {
            alert('El pedido se marcó como pagado, pero hubo un detalle con Skydropx: ' + res.message);
          } else {
            alert('Pedido marcado como pagado y guía de Skydropx generada correctamente.');
          }
        } catch (shipErr) {
          console.error("Error al crear guía:", shipErr);
          alert('Pedido marcado como pagado, pero falló la generación de guía automática: ' + shipErr.message);
        }

        await loadAllData();
        setSelectedOrder(null);
      } catch (err) {
        alert("Error al actualizar el pedido: " + err.message);
      }
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data: uploadData, error } = await supabase.storage
      .from('productos')
      .upload(filePath, file);

    if (error) {
      alert('Error al subir imagen: ' + error.message);
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('productos')
      .getPublicUrl(filePath);

    setNewCorte(prev => ({ ...prev, imagen_url: publicUrl }));
    setIsUploading(false);
  };

  const handleCreateProduct = async () => {
    if (!newCorte.nombre || !newCorte.imagen_url || selectedColors.length === 0) {
      alert('Por favor completa todos los campos y selecciona al menos un color.');
      return;
    }

    setLoading(true);
    
    // 1. Crear el Corte
    const { data: corteData, error: corteError } = await supabase
      .from('cortes')
      .insert([newCorte])
      .select();

    if (corteError) {
      alert('Error al crear corte: ' + corteError.message);
      setLoading(false);
      return;
    }

    const corteId = corteData[0].id;

    // 2. Vincular Colores
    const relations = selectedColors.map(colorId => ({
      corte_id: corteId,
      color_id: colorId
    }));

    const { error: relError } = await supabase
      .from('corte_colores')
      .insert(relations);

    if (relError) {
      alert('Error al vincular colores: ' + relError.message);
      setLoading(false);
      return;
    }

    // 3. Generar Inventario (Tallas CH a XXL)
    const tallas = ['CH', 'M', 'G', 'XL', 'XXL'];
    const inventarioEntries = [];
    
    selectedColors.forEach(colorId => {
      tallas.forEach(talla => {
        inventarioEntries.push({
          corte_id: corteId,
          color_id: colorId,
          talla: talla,
          stock: 0,
          precio_unitario: 70
        });
      });
    });

    const { error: invError } = await supabase
      .from('inventario')
      .insert(inventarioEntries);

    if (invError) {
      alert('Error al generar inventario: ' + invError.message);
    }

    // Reset y Recargar
    setNewCorte({ nombre: '', imagen_url: '' });
    setSelectedColors([]);
    await loadAllData();
    setActiveTab('inventario'); // Ir al inventario para poner stock
  };

  const handleDraftChange = (id, field, value) => {
    setEditDraft(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const [isSavingAll, setIsSavingAll] = useState(false);

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    let hasError = false;
    let missingSkuColumn = false;
    let lastErrorMsg = '';

    // Find which items actually changed
    const itemsToUpdate = data.inventario.filter(item => {
      const draft = editDraft[item.id];
      if (!draft) return false;
      return parseInt(draft.stock) !== item.stock ||
             parseFloat(draft.price) !== item.precio_unitario ||
             parseInt(draft.discount) !== (item.descuento_porcentaje || 0) ||
             (draft.sku || '') !== (item.sku || '');
    });

    if (itemsToUpdate.length === 0) {
      setIsSavingAll(false);
      return;
    }

    for (const item of itemsToUpdate) {
      const draft = editDraft[item.id];
      const updates = {
        stock: parseInt(draft.stock),
        precio_unitario: parseFloat(draft.price),
        descuento_porcentaje: parseInt(draft.discount)
      };

      if ((draft.sku || '') !== (item.sku || '')) {
        updates.sku = draft.sku || null;
      }

      try {
        const { error } = await updateInventarioItem(item.id, updates);
        if (error) {
          console.error("Error updating item:", item.id, error);
          lastErrorMsg = error.message || JSON.stringify(error);
          if (error.code === '42703' || (error.message && (error.message.toLowerCase().includes('sku') || error.message.toLowerCase().includes('column') || error.message.toLowerCase().includes('columna')))) {
            missingSkuColumn = true;
          }
          hasError = true;
        }
      } catch (err) {
        console.error("Catch error updating item:", item.id, err);
        lastErrorMsg = err.message || String(err);
        hasError = true;
      }
    }

    if (missingSkuColumn) {
      setShowMigrationModal(true);
    } else if (!hasError) {
      await loadAllData();
    } else {
      alert('Hubo un error al guardar los cambios: ' + lastErrorMsg);
    }
    setIsSavingAll(false);
  };

  const handleSyncBind = async () => {
    const hasUnsavedChanges = data.inventario.some(item => {
      const draft = editDraft[item.id];
      if (!draft) return false;
      return (draft.sku || '') !== (item.sku || '');
    });

    if (hasUnsavedChanges) {
      alert('Tienes cambios de SKU/vinculación sin guardar. Por favor, haz clic en "GUARDAR CAMBIOS" antes de sincronizar para registrar los SKUs en la base de datos.');
      return;
    }

    setIsSyncing(true);
    try {
      // Invocar la Edge Function usando método POST para ejecutar la sincronización del lado del servidor
      const { data: resData, error: invokeError } = await supabase.functions.invoke('bind-inventory', {
        method: 'POST'
      });

      if (invokeError) throw invokeError;

      if (!resData || !resData.success) {
        throw new Error('Error al conectar con la API de Bind ERP a través de la Edge Function.');
      }

      const syncCount = resData.syncCount || 0;
      
      // Actualizar la lista local de productos de Bind ERP si se retornaron
      if (resData.products) {
        setBindProducts(resData.products);
      }

      alert(`Sincronización completada. Se actualizaron ${syncCount} variantes de inventario con los niveles de stock de Bind ERP.`);
      await loadAllData();
      
    } catch (e) {
      alert(e.message || 'Error durante la sincronización.');
    }
    setIsSyncing(false);
  };

  const handleAddColor = async () => {
    if (!newColor.nombre) return;
    const { error } = await addColor(newColor);
    if (!error) {
      setNewColor({ nombre: '', hex: '#ffffff', tint_class: 'bg-white' });
      loadAllData();
    }
  };

  const handleDeleteColor = async (id) => {
    if (window.confirm('¿Eliminar este color?')) {
      const { error } = await deleteColor(id);
      if (!error) loadAllData();
    }
  };

  const handleEscalasDraftChange = (id, field, value) => {
    setEditEscalasDraft(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleCreateEscala = async () => {
    if (!newEscala.min_qty || !newEscala.precio) {
      alert('Por favor completa al menos la cantidad mínima y el precio.');
      return;
    }
    setLoading(true);
    const { error } = await addEscala({
      min_qty: parseInt(newEscala.min_qty),
      max_qty: newEscala.max_qty === '' ? null : parseInt(newEscala.max_qty),
      precio: parseFloat(newEscala.precio)
    });
    if (error) {
      alert('Error al crear escala de precio: ' + error.message);
    } else {
      setNewEscala({ min_qty: '', max_qty: '', precio: '' });
      await loadAllData();
    }
    setLoading(false);
  };

  const handleSaveEscalas = async () => {
    setIsSavingEscalas(true);
    let hasError = false;
    
    const scalesToUpdate = data.escalas.filter(scale => {
      const draft = editEscalasDraft[scale.id];
      if (!draft) return false;
      const draftMaxQty = draft.max_qty === '' ? null : parseInt(draft.max_qty);
      return parseInt(draft.min_qty) !== scale.min_qty ||
             draftMaxQty !== scale.max_qty ||
             parseFloat(draft.precio) !== parseFloat(scale.precio);
    });

    for (const scale of scalesToUpdate) {
      const draft = editEscalasDraft[scale.id];
      const { error } = await updateEscala(scale.id, {
        min_qty: parseInt(draft.min_qty),
        max_qty: draft.max_qty === '' ? null : parseInt(draft.max_qty),
        precio: parseFloat(draft.precio)
      });
      if (error) hasError = true;
    }

    if (!hasError) {
      alert('Escalas de precios guardadas correctamente.');
      await loadAllData();
    } else {
      alert('Hubo un error al guardar algunas escalas de precios.');
    }
    setIsSavingEscalas(false);
  };

  const handleDeleteEscala = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta escala de precio?')) {
      setLoading(true);
      const { error } = await deleteEscala(id);
      if (error) {
        alert('Error al eliminar escala de precio: ' + error.message);
      } else {
        await loadAllData();
      }
      setLoading(false);
    }
  };
;


  // Filtrado y Ordenación de Inventario
  const filteredInventario = data.inventario.filter(item => {
    const matchCorte = filterCorte === 'all' || item.corte_id === filterCorte;
    const matchColor = filterColor === 'all' || item.color_id === filterColor;
    return matchCorte && matchColor;
  }).sort((a, b) => {
    // 1. Ordenar por Corte (alfabético)
    const corteA = data.cortes.find(c => c.id === a.corte_id)?.nombre || '';
    const corteB = data.cortes.find(c => c.id === b.corte_id)?.nombre || '';
    if (corteA !== corteB) return corteA.localeCompare(corteB);
    
    // 2. Ordenar por Color (alfabético)
    const colorA = data.colores.find(c => c.id === a.color_id)?.nombre || '';
    const colorB = data.colores.find(c => c.id === b.color_id)?.nombre || '';
    if (colorA !== colorB) return colorA.localeCompare(colorB);
    
    // 3. Ordenar por Talla (XS, CH, M, G, XL, XXL)
    const sizeOrder = ['XS', 'CH', 'M', 'G', 'XL', 'XXL'];
    const indexA = sizeOrder.indexOf(a.talla);
    const indexB = sizeOrder.indexOf(b.talla);
    
    const valA = indexA === -1 ? 999 : indexA;
    const valB = indexB === -1 ? 999 : indexB;
    return valA - valB;
  });

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500/30">
      {/* Sidebar / Header */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
          <div className="flex items-center gap-4">
            <img src="/CREATIVITY - EA.png" alt="Logo" className="w-12 h-12 invert brightness-200" />
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
              Admin.
            </h1>
          </div>
            <p className="text-gray-500 mt-2 font-medium">Gestiona tu catálogo e inventario en tiempo real.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all"
            >
              Ver Tienda
            </button>
            <button 
              onClick={() => navigate('/cerebro')}
              className="px-6 py-2.5 rounded-full bg-purple-600 border border-purple-500/20 text-white text-sm font-bold hover:bg-purple-500 transition-all flex items-center gap-1.5 shadow-lg shadow-purple-500/10"
            >
              🧠 El Cerebro
            </button>
            <button 
              onClick={handleLogout}
              className="px-6 py-2.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold hover:bg-red-500 hover:text-white transition-all"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>


        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit mb-8 border border-white/5 overflow-x-auto">
          {['inventario', 'pedidos', 'colores', 'cortes', 'escalas', 'importar_ventas', 'objetivos IA'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              {tab === 'escalas' ? 'Escalas de Precios' : tab === 'importar_ventas' ? 'Importar Ventas (CSV/Excel)' : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-xl shadow-2xl">
          {activeTab === 'inventario' && (
            <>
              {/* Filtros */}
              <div className="p-6 border-b border-white/10 flex flex-wrap gap-4 bg-white/[0.02] justify-between items-end">
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Filtrar por Corte</label>
                    <select 
                      value={filterCorte}
                      onChange={(e) => setFilterCorte(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 w-48"
                    >
                      <option value="all">Todos los cortes</option>
                      {data.cortes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Filtrar por Color</label>
                    <select 
                      value={filterColor}
                      onChange={(e) => setFilterColor(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 w-48"
                    >
                      <option value="all">Todos los colores</option>
                      {data.colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <span className="text-xs text-gray-500 font-medium">Mostrando {filteredInventario.length} variantes</span>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={handleSyncBind}
                    disabled={isSyncing || isSavingAll}
                    className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                      isSyncing 
                        ? 'bg-blue-500/20 text-blue-400 animate-pulse cursor-not-allowed border border-blue-500/30' 
                        : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <span className="text-base">🔄</span>
                        Sincronizar Bind
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSaveAll}
                    disabled={isSavingAll || isSyncing}
                    className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                      isSavingAll 
                        ? 'bg-blue-500 text-white animate-pulse cursor-not-allowed' 
                        : 'bg-green-500 text-white hover:bg-green-400 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {isSavingAll ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-black uppercase tracking-widest text-gray-500">
                      <th className="px-8 py-6">Producto / Variante</th>
                      <th className="px-8 py-6">Talla</th>
                      <th className="px-8 py-6">SKU Bind</th>
                      <th className="px-8 py-6">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredInventario.map(item => {
                      const corte = data.cortes.find(c => c.id === item.corte_id);
                      const color = data.colores.find(c => c.id === item.color_id);
                      const draft = editDraft[item.id] || { stock: item.stock, price: item.precio_unitario, discount: item.descuento_porcentaje || 0, sku: item.sku || '' };

                      return (
                        <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full border border-white/10" style={{ backgroundColor: color?.hex }}></div>
                              <div>
                                <div className="font-bold text-sm">{corte?.nombre}</div>
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">{color?.nombre}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4 font-mono font-bold text-blue-400">{item.talla}</td>
                          <td className="px-8 py-4">
                            <div className="relative group/sku">
                              <input 
                                type="text" 
                                value={draft.sku || ''}
                                placeholder="Sin vincular"
                                onChange={(e) => handleDraftChange(item.id, 'sku', e.target.value)}
                                className="bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 w-32 text-xs font-bold focus:outline-none focus:border-blue-500 transition-all font-mono text-white"
                              />
                              {bindProducts.length > 0 && (
                                <div className="absolute left-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-xl max-h-40 overflow-y-auto hidden group-focus-within/sku:block z-50 w-56 shadow-2xl">
                                  {bindProducts
                                    .filter(p => {
                                      const term = (draft.sku || '').toLowerCase();
                                      return (p.SKU || '').toLowerCase().includes(term) || 
                                             (p.Code || '').toLowerCase().includes(term) ||
                                             (p.Title || '').toLowerCase().includes(term);
                                    })
                                    .slice(0, 5)
                                    .map(p => (
                                      <button
                                        key={p.ID}
                                        type="button"
                                        onMouseDown={() => handleDraftChange(item.id, 'sku', p.SKU || p.Code)}
                                        className="w-full text-left px-3 py-2 text-[10px] hover:bg-white/10 transition-colors border-b border-white/5 font-mono"
                                      >
                                        <div className="font-bold text-white truncate">{p.SKU || p.Code || 'Sin código'}</div>
                                        <div className="text-gray-500 truncate text-[9px]">{p.Title}</div>
                                      </button>
                                    ))
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <input 
                              type="number" 
                              value={draft.stock}
                              onChange={(e) => handleDraftChange(item.id, 'stock', e.target.value)}
                              className="bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 w-20 text-xs font-bold focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </td>

                        </tr>
                      );
                    })}
                    {filteredInventario.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-gray-600">🔍</div>
                            <div>
                              <p className="text-white font-bold">Sin resultados</p>
                              <p className="text-gray-500 text-sm">Prueba ajustando los filtros de búsqueda.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}


          {activeTab === 'pedidos' && (
            <>
              {/* Filtro de Estatus de Pedidos */}
              <div className="p-6 border-b border-white/10 flex flex-wrap gap-4 bg-white/[0.02] justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Estatus del Pago</label>
                    <div className="flex gap-2">
                      {['all', 'pagado', 'pendiente'].map((statusOption) => (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() => setFilterOrderStatus(statusOption)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                            filterOrderStatus === statusOption
                              ? 'bg-blue-600 text-white'
                              : 'bg-black/40 text-gray-400 border border-white/10 hover:text-white'
                          }`}
                        >
                          {statusOption === 'all' ? 'Todos' : statusOption}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  Mostrando {orders.filter(o => filterOrderStatus === 'all' || o.status === filterOrderStatus).length} pedidos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-black uppercase tracking-widest text-gray-500">
                      <th className="px-8 py-6">Fecha / ID</th>
                      <th className="px-8 py-6">Cliente</th>
                      <th className="px-8 py-6">Detalles</th>
                      <th className="px-8 py-6">Total</th>
                      <th className="px-8 py-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders
                      .filter(order => filterOrderStatus === 'all' || order.status === filterOrderStatus)
                      .map(order => (
                        <tr 
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)}
                          className="group hover:bg-white/[0.05] transition-all cursor-pointer"
                        >
                          <td className="px-8 py-6">
                            <div className="text-xs font-mono text-gray-400">#{order.id.slice(0, 8)}</div>
                            <div className="text-sm font-bold mt-1">{new Date(order.created_at).toLocaleDateString()}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="font-bold text-sm">{order.cliente_nombre}</div>
                            <div className="text-xs text-gray-500">{order.cliente_email}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-1">
                              {order.items.slice(0, 2).map((item, i) => (
                                <div key={i} className="text-[10px] text-gray-400">
                                  <span className="font-black text-blue-400">{item.quantity}x</span> {item.category}
                                </div>
                              ))}
                              {order.items.length > 2 && <div className="text-[10px] text-gray-600 font-bold">+{order.items.length - 2} más...</div>}
                            </div>
                          </td>
                          <td className="px-8 py-6 font-black text-lg">
                            ${parseFloat(order.total).toLocaleString()}
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${order.status === 'pagado' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {orders.filter(order => filterOrderStatus === 'all' || order.status === filterOrderStatus).length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-8 py-20 text-center text-gray-500 font-medium italic">
                          No hay pedidos con este estatus.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'colores' && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Formulario Nuevo Color */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
                  <h3 className="text-lg font-bold">Nuevo Color</h3>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Nombre del color" 
                      value={newColor.nombre}
                      onChange={e => setNewColor({...newColor, nombre: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        value={newColor.hex}
                        onChange={e => setNewColor({...newColor, hex: e.target.value})}
                        className="h-10 w-20 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        placeholder="Tailwind class (bg-blue-200)" 
                        value={newColor.tint_class}
                        onChange={e => setNewColor({...newColor, tint_class: e.target.value})}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAddColor}
                    className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Agregar Color
                  </button>
                </div>

                {/* Lista de Colores */}
                {data.colores.map(color => (
                  <div key={color.id} className="bg-white/5 rounded-2xl p-6 border border-white/10 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full border-2 border-white/20 shadow-xl" style={{ backgroundColor: color.hex }}></div>
                      <div>
                        <div className="font-bold">{color.nombre}</div>
                        <div className="text-xs text-gray-500 font-mono uppercase">{color.hex}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteColor(color.id)}
                      className="p-2 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cortes' && (
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulario Nuevo Producto */}
                <div className="lg:col-span-1 bg-white/5 rounded-3xl p-8 border border-white/10 flex flex-col gap-6 h-fit sticky top-8">
                  <div>
                    <h3 className="text-2xl font-black mb-2">Nuevo Producto</h3>
                    <p className="text-gray-500 text-sm">Crea un nuevo modelo y genera su inventario.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nombre del Modelo</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Sudadera Hoodie" 
                        value={newCorte.nombre}
                        onChange={e => setNewCorte({...newCorte, nombre: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Imagen de Silueta (PNG)</label>
                      <div className="relative group">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${newCorte.imagen_url ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 group-hover:border-white/20 bg-white/5'}`}>
                          {isUploading ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : newCorte.imagen_url ? (
                            <>
                              <img src={newCorte.imagen_url} className="h-20 object-contain" />
                              <span className="text-[10px] font-bold text-green-500">Imagen cargada ✓</span>
                            </>
                          ) : (
                            <>
                              <span className="text-2xl">📁</span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase">Subir archivo</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Colores Disponibles</label>
                      <div className="flex flex-wrap gap-2 p-3 bg-black/20 rounded-2xl border border-white/5 max-h-40 overflow-y-auto">
                        {data.colores.map(color => (
                          <button
                            key={color.id}
                            onClick={() => {
                              if (selectedColors.includes(color.id)) {
                                setSelectedColors(selectedColors.filter(id => id !== color.id));
                              } else {
                                setSelectedColors([...selectedColors, color.id]);
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                              selectedColors.includes(color.id) 
                                ? 'bg-white text-black border-white' 
                                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'
                            }`}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color.hex }}></div>
                            {color.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleCreateProduct}
                    disabled={loading || isUploading}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creando...' : 'Crear Producto y Generar Inventario'}
                  </button>
                </div>

                {/* Lista de Cortes Existentes */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.cortes.map(corte => (
                    <div key={corte.id} className="bg-white/5 rounded-[2rem] p-8 border border-white/10 flex flex-col items-center group hover:bg-white/[0.07] transition-all">
                      <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <img src={corte.imagen_url} alt={corte.nombre} className="relative z-10 w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500" />
                      </div>
                      <h3 className="text-xl font-black">{corte.nombre}</h3>
                      <p className="text-gray-500 text-sm mt-1 uppercase font-black tracking-widest text-[10px]">Modelo Activo</p>
                      
                      <div className="mt-6 flex flex-wrap justify-center gap-1">
                        {data.relations.filter(r => r.corte_id === corte.id).map(r => {
                          const color = data.colores.find(col => col.id === r.color_id);
                          return color ? (
                            <div key={color.id} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} title={color.nombre}></div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'objetivos IA' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white">Objetivos y Tareas (IA)</h2>
                  <p className="text-gray-400 text-sm">Realiza un seguimiento de las metas de franquicias y mejoras en desarrollo.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulario Nuevo Objetivo */}
                <div className="lg:col-span-1 bg-white/5 rounded-3xl p-8 border border-white/10 flex flex-col gap-6 h-fit sticky top-8">
                  <h3 className="text-xl font-black">Nuevo Objetivo</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Título</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Automatizar franquicias" 
                        value={newObjective.title}
                        onChange={e => setNewObjective({...newObjective, title: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Descripción</label>
                      <textarea 
                        rows="4"
                        placeholder="Detalles del objetivo..." 
                        value={newObjective.description}
                        onChange={e => setNewObjective({...newObjective, description: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Estado Inicial</label>
                      <select 
                        value={newObjective.status}
                        onChange={e => setNewObjective({...newObjective, status: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En Progreso</option>
                        <option value="completed">Completado</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={handleCreateObjective}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50"
                  >
                    Añadir Objetivo
                  </button>
                </div>

                {/* Lista de Objetivos */}
                <div className="lg:col-span-2 space-y-4">
                  {objectives.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 bg-white/5 rounded-3xl border border-white/10">
                      No hay objetivos registrados aún.
                    </div>
                  ) : (
                    objectives.map(obj => (
                      <div key={obj.id} className="bg-white/5 rounded-[2rem] p-6 border border-white/10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-black text-white">{obj.title}</h4>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              obj.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              obj.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {obj.status === 'completed' ? 'Completado' : obj.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">{obj.description}</p>
                          <div className="text-[10px] text-gray-500 mt-2">
                            Creado: {new Date(obj.created_at).toLocaleDateString('es-MX')}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <select 
                            value={obj.status}
                            onChange={(e) => handleStatusChange(obj.id, e.target.value)}
                            className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-white transition-colors cursor-pointer"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="in_progress">En Progreso</option>
                            <option value="completed">Completado</option>
                          </select>
                          <button 
                            onClick={() => handleDeleteObjective(obj.id)}
                            className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            title="Eliminar"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'escalas' && (
            <div className="p-8">
              {data.escalasError ? (
                <div className="max-w-3xl mx-auto bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-4xl">⚠️</span>
                    <div>
                      <h2 className="text-2xl font-black text-amber-500">Configuración de Base de Datos Requerida</h2>
                      <p className="text-gray-400 text-sm mt-1">La tabla para gestionar las escalas de precios aún no existe en Supabase.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Para habilitar esta función, copia el siguiente script SQL, ve al <strong>SQL Editor</strong> en tu panel de Supabase, pégalo y presiona <strong>Run</strong>:
                    </p>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Consulta SQL de Migración</label>
                      <pre className="bg-black/60 rounded-2xl p-6 font-mono text-xs text-green-400 border border-white/5 overflow-x-auto select-all leading-5">
{`-- 1. Crear la tabla de escalas de precios
CREATE TABLE escalas_precios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER, -- NULL representa límite superior infinito (ej. 100+)
  precio NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE escalas_precios ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso público/autenticado
CREATE POLICY "Permitir lectura publica de escalas" 
ON escalas_precios FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Permitir gestion completa a administradores" 
ON escalas_precios FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

-- 4. Insertar los rangos actuales predeterminados (Semilla)
INSERT INTO escalas_precios (min_qty, max_qty, precio) VALUES 
(1, 49, 89),
(50, 99, 79),
(100, NULL, 69);`}
                      </pre>
                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                      <button 
                        onClick={loadAllData}
                        className="px-6 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 transition-all text-xs"
                      >
                        🔄 Ya ejecuté el script (Refrescar)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-white">Escalas de Precios Dinámicas</h2>
                      <p className="text-gray-400 text-sm">Configura los rangos de cantidades y precios unitarios aplicados en el checkout.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Formulario Nueva Escala */}
                    <div className="lg:col-span-1 bg-white/5 rounded-3xl p-8 border border-white/10 flex flex-col gap-6 h-fit sticky top-8">
                      <div>
                        <h3 className="text-xl font-black">Nueva Escala</h3>
                        <p className="text-gray-500 text-xs mt-1">Crea un rango de piezas y su precio unitario.</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cantidad Mínima</label>
                          <input 
                            type="number" 
                            placeholder="Ej. 1" 
                            value={newEscala.min_qty}
                            onChange={e => setNewEscala({...newEscala, min_qty: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cantidad Máxima (Opcional)</label>
                          <input 
                            type="number" 
                            placeholder="Ej. 49 (dejar vacío para sin límite, ej. 100+)" 
                            value={newEscala.max_qty}
                            onChange={e => setNewEscala({...newEscala, max_qty: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Precio Unitario (MXN)</label>
                          <input 
                            type="number" 
                            placeholder="Ej. 89" 
                            value={newEscala.precio}
                            onChange={e => setNewEscala({...newEscala, precio: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={handleCreateEscala}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50"
                      >
                        Añadir Rango
                      </button>
                    </div>

                    {/* Lista de Escalas */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex justify-between items-center mb-2 px-2">
                        <span className="text-xs text-gray-500 font-medium">
                          Mostrando {data.escalas.length} rangos de precio
                        </span>
                        <button
                          onClick={handleSaveEscalas}
                          disabled={isSavingEscalas}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            isSavingEscalas 
                              ? 'bg-blue-500 text-white animate-pulse cursor-not-allowed' 
                              : 'bg-green-500 text-white hover:bg-green-400 hover:shadow-lg'
                          }`}
                        >
                          {isSavingEscalas ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                      </div>

                      {data.escalas.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 bg-white/5 rounded-3xl border border-white/10">
                          No hay escalas de precio configuradas.
                        </div>
                      ) : (
                        <div className="overflow-hidden bg-white/[0.02] border border-white/10 rounded-3xl">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-white/10 text-xs font-black uppercase tracking-widest text-gray-500">
                                <th className="px-6 py-4">Rango (Cantidades)</th>
                                <th className="px-6 py-4">Cantidad Mínima</th>
                                <th className="px-6 py-4">Cantidad Máxima</th>
                                <th className="px-6 py-4">Precio Unitario</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {data.escalas.map(scale => {
                                const draft = editEscalasDraft[scale.id] || { min_qty: scale.min_qty, max_qty: scale.max_qty !== null ? scale.max_qty : '', precio: scale.precio };
                                return (
                                  <tr key={scale.id} className="hover:bg-white/[0.01]">
                                    <td className="px-6 py-4 font-bold text-sm text-blue-400">
                                      {scale.max_qty ? `${scale.min_qty} a ${scale.max_qty} pzs` : `Más de ${scale.min_qty - 1} pzs (${scale.min_qty}+)`}
                                    </td>
                                    <td className="px-6 py-4">
                                      <input 
                                        type="number"
                                        value={draft.min_qty}
                                        onChange={(e) => handleEscalasDraftChange(scale.id, 'min_qty', e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 w-20 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                      <input 
                                        type="number"
                                        placeholder="∞"
                                        value={draft.max_qty}
                                        onChange={(e) => handleEscalasDraftChange(scale.id, 'max_qty', e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 w-20 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-500 text-xs">$</span>
                                        <input 
                                          type="number"
                                          value={draft.precio}
                                          onChange={(e) => handleEscalasDraftChange(scale.id, 'precio', e.target.value)}
                                          className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 w-24 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <button 
                                        onClick={() => handleDeleteEscala(scale.id)}
                                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                        title="Eliminar"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'importar_ventas' && (
            <div className="p-8">
              {!data.ventasTableExists ? (
                <div className="max-w-3xl mx-auto bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-4xl">⚠️</span>
                    <div>
                      <h2 className="text-2xl font-black text-amber-500">Configuración de Base de Datos Requerida</h2>
                      <p className="text-gray-400 text-sm mt-1">La tabla para gestionar el histórico de ventas (`ventas_sucursales`) aún no existe en Supabase.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Para habilitar esta función, copia el siguiente script SQL, ve al <strong>SQL Editor</strong> en tu panel de Supabase, pégalo y presiona <strong>Run</strong>:
                    </p>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Consulta SQL de Migración</label>
                      <pre className="bg-black/60 rounded-2xl p-6 font-mono text-xs text-green-400 border border-white/5 overflow-x-auto select-all leading-5">
{`-- 1. Crear la tabla de ventas históricas por sucursal
CREATE TABLE ventas_sucursales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  sku TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  total NUMERIC NOT NULL DEFAULT 0,
  sucursal TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE ventas_sucursales ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso público/autenticado
CREATE POLICY "Permitir lectura publica de ventas_sucursales" 
ON ventas_sucursales FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Permitir gestion completa de ventas_sucursales" 
ON ventas_sucursales FOR ALL 
TO public
USING (true) 
WITH CHECK (true);`}
                      </pre>
                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                      <button 
                        onClick={loadAllData}
                        className="px-6 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 transition-all text-xs"
                      >
                        🔄 Ya ejecuté el script (Refrescar)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-white">Importar Ventas Históricas (Excel/CSV)</h2>
                      <p className="text-gray-400 text-sm">Carga el histórico mensual de remisiones o facturas directamente desde archivos descargados de Bind ERP.</p>
                    </div>
                    <button
                      onClick={handleClearHistory}
                      disabled={isImporting}
                      className="px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white transition-all w-fit disabled:opacity-50 shrink-0"
                    >
                      🗑️ Limpiar Historial de Ventas
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Selector de Archivos y Estado */}
                    <div className="lg:col-span-1 bg-white/5 rounded-3xl p-8 border border-white/10 flex flex-col gap-6 h-fit sticky top-8">
                      <div>
                        <h3 className="text-xl font-black">Selecciona el Reporte</h3>
                        <p className="text-gray-500 text-xs mt-1">Soporta formatos .xls, .xlsx y .csv de Bind ERP.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="relative group">
                          <input 
                            type="file" 
                            accept=".csv, .xls, .xlsx"
                            onChange={handleFileSelect}
                            disabled={isImporting}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                          />
                          <div className={`w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${selectedFileName ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 group-hover:border-white/20 bg-white/5'}`}>
                            <span className="text-3xl">📊</span>
                            {selectedFileName ? (
                              <div className="text-center px-4">
                                <span className="text-[11px] font-mono font-bold text-green-400 block truncate max-w-[200px]">{selectedFileName}</span>
                                <span className="text-[9px] text-gray-500 block mt-1 uppercase font-black">Archivo Cargado ✓</span>
                              </div>
                            ) : (
                              <div className="text-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase block">Arrastra o selecciona archivo</span>
                                <span className="text-[8px] text-gray-600 font-bold uppercase mt-1 block">CSV o Excel</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {xlsParsingError && (
                          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-semibold leading-relaxed">
                            {xlsParsingError}
                          </div>
                        )}

                        {importStatusMessage && (
                          <div className={`p-4 rounded-2xl text-xs font-bold leading-relaxed border ${
                            importStatusMessage.includes('Error') 
                              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                              : importStatusMessage.includes('completada') || importStatusMessage.includes('éxito')
                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          }`}>
                            {importStatusMessage}
                          </div>
                        )}

                        {isImporting && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                              <span>Progreso</span>
                              <span>{importProgress}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                              <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {csvRows.length > 0 && (
                        <button 
                          onClick={handleStartImport}
                          disabled={isImporting}
                          className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isImporting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              Importando...
                            </>
                          ) : (
                            `Comenzar Carga (${csvRows.length} registros)`
                          )}
                        </button>
                      )}
                    </div>

                    {/* Mapeador de Columnas */}
                    <div className="lg:col-span-2 space-y-6">
                      {csvHeaders.length > 0 ? (
                        <>
                          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 space-y-6">
                            <div>
                              <h3 className="text-xl font-black text-white">Mapeo de Columnas de Datos</h3>
                              <p className="text-gray-400 text-xs mt-1">El asistente ha pre-detectado las cabeceras. Verifica que correspondan correctamente a tu archivo.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Fecha */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Fecha de Venta (Emisión) <span className="text-red-500">*</span></label>
                                <select 
                                  value={importMapping.fecha}
                                  onChange={e => setImportMapping({...importMapping, fecha: e.target.value})}
                                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="">-- Selecciona columna --</option>
                                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div>

                              {/* SKU */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Código de Producto / SKU <span className="text-red-500">*</span></label>
                                <select 
                                  value={importMapping.sku}
                                  onChange={e => setImportMapping({...importMapping, sku: e.target.value})}
                                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="">-- Selecciona columna --</option>
                                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div>

                              {/* Cantidad */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Cantidad de piezas (Opcional)</label>
                                <select 
                                  value={importMapping.cantidad || ''}
                                  onChange={e => setImportMapping({...importMapping, cantidad: e.target.value})}
                                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="">Por defecto (1 unidad)</option>
                                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div>

                              {/* Total */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Total de la Venta (MXN) <span className="text-red-500">*</span></label>
                                <select 
                                  value={importMapping.total}
                                  onChange={e => setImportMapping({...importMapping, total: e.target.value})}
                                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="">-- Selecciona columna --</option>
                                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div>

                              {/* Sucursal */}
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Sucursal / Almacén Origen <span className="text-red-500">*</span></label>
                                <select 
                                  value={importMapping.sucursal}
                                  onChange={e => setImportMapping({...importMapping, sucursal: e.target.value})}
                                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  <option value="">-- Selecciona columna --</option>
                                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Vista Previa de los primeros registros */}
                          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Vista Previa de Filas (Primeras 3 filas)</h4>
                            <div className="overflow-x-auto border border-white/5 rounded-2xl bg-black/20">
                              <table className="w-full text-left text-[10px] font-mono text-gray-400">
                                <thead>
                                  <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase tracking-wider text-gray-500">
                                    {csvHeaders.slice(0, 5).map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
                                    {csvHeaders.length > 5 && <th className="px-4 py-3 text-gray-600">...</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {csvRows.slice(0, 3).map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-white/[0.01]">
                                      {csvHeaders.slice(0, 5).map((h, hIdx) => (
                                        <td key={hIdx} className="px-4 py-2.5 truncate max-w-[120px]">{String(row[hIdx] !== undefined ? row[hIdx] : '')}</td>
                                      ))}
                                      {csvHeaders.length > 5 && <td className="px-4 py-2.5 text-gray-600">...</td>}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-12 text-center text-gray-500 bg-white/5 rounded-[2rem] border border-white/10 flex flex-col items-center justify-center min-h-[300px]">
                          <span className="text-5xl mb-4 opacity-50">📂</span>
                          <h3 className="text-lg font-bold text-white mb-2">Esperando archivo...</h3>
                          <p className="text-sm text-gray-400 max-w-sm">Selecciona o arrastra el archivo de Excel o CSV exportado desde Bind ERP en el panel de la izquierda para comenzar el mapeo de columnas.</p>
                        </div>
                      )}

                      {/* Advertencias y errores de formato */}
                      {importErrors.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-6 space-y-3">
                          <h4 className="text-xs font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                            <span>⚠️</span> Advertencias y Errores de Validación ({importErrors.length})
                          </h4>
                          <div className="max-h-36 overflow-y-auto text-[10px] font-mono text-red-300 space-y-1.5 custom-scrollbar pr-2">
                            {importErrors.map((err, i) => <div key={i}>{err}</div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
      {/* Modal Detalle de Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
          <div className="relative bg-[#1A1A1A] border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-8 border-b border-white/5 flex justify-between items-start">
              <div>
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Detalles del Pedido</div>
                <h3 className="text-2xl font-black">#{selectedOrder.id.slice(0, 8)}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Cliente</h4>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="font-bold text-lg">{selectedOrder.cliente_nombre}</div>
                    <div className="text-gray-400 text-sm mt-1">{selectedOrder.cliente_email}</div>
                    <div className="text-gray-400 text-sm">{selectedOrder.cliente_telefono}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Dirección de Envío</h4>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="text-white text-sm font-medium leading-relaxed">{selectedOrder.direccion}</div>
                    <div className="text-blue-400 font-bold text-xs mt-2 uppercase tracking-tighter">CP: {selectedOrder.codigo_postal}</div>
                  </div>
                </div>
              </div>

              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Artículos</h4>
              <div className="space-y-3 mb-8">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full border border-white/10" style={{ backgroundColor: item.colorHex }}></div>
                      <div>
                        <div className="font-bold text-sm">{item.category}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">{item.color} • Talla {item.size}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-white">{item.quantity} pz</div>
                      <div className="text-[10px] text-gray-500">${item.price.toFixed(2)} c/u</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resumen de Pago</h4>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedOrder.status === 'pagado' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold">${(parseFloat(selectedOrder.total) - parseFloat(selectedOrder.envio_costo)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Envío</span>
                  <span className="font-bold">${parseFloat(selectedOrder.envio_costo).toLocaleString()}</span>
                </div>
                <div className="h-px bg-white/10 my-2"></div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {selectedOrder.status === 'pagado' ? 'Total Pagado' : 'Total (Pendiente de Pago)'}
                  </span>
                  <span className={`text-3xl font-black ${selectedOrder.status === 'pagado' ? 'text-green-400' : 'text-yellow-500'}`}>
                    ${parseFloat(selectedOrder.total).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 bg-black/20 border-t border-white/5 flex justify-end gap-4">
              <button className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-sm">Imprimir Ticket</button>
              {selectedOrder.status === 'pendiente' ? (
                <button 
                  onClick={() => handleMarkAsPaid(selectedOrder.id)}
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black transition-all text-sm shadow-xl shadow-green-900/20 disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : 'Marcar como Pagado'}
                </button>
              ) : (
                <button className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black transition-all text-sm shadow-xl shadow-blue-900/20">Preparar Envío</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para migración de base de datos */}
      {showMigrationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMigrationModal(false)}></div>
          <div className="relative bg-[#1A1A1A] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Configuración Requerida</div>
                <h3 className="text-2xl font-black text-white">Preparar Base de Datos</h3>
              </div>
              <button onClick={() => setShowMigrationModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-400 leading-relaxed">
                Para vincular tu inventario con <strong>Bind ERP</strong>, es necesario agregar la columna <code>sku</code> a la tabla de inventario en Supabase.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Consulta SQL</label>
                <div className="bg-black/60 rounded-xl p-4 font-mono text-xs text-green-400 border border-white/5 relative group select-all">
                  ALTER TABLE inventario ADD COLUMN sku TEXT;
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-400 leading-relaxed">
                <strong>Instrucciones:</strong> Copia la consulta de arriba, ve a tu panel de Supabase, entra al <strong>SQL Editor</strong>, pega la consulta y haz clic en <strong>Run</strong>. Una vez hecho esto, podrás guardar tus claves SKU y sincronizar existencias de inmediato.
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => setShowMigrationModal(false)}
                className="px-6 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 transition-all text-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
