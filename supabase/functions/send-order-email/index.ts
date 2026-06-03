import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
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
    const body = await req.json()
    console.log("Request body received:", JSON.stringify(body))

    // Soporta tanto webhook de Supabase ('record') como llamada directa del frontend ('order_id')
    let order = body.record
    const orderId = body.order_id || order?.id

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Falta order_id o record en los parámetros' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Si solo tenemos el ID o faltan datos del cliente, consultamos la orden completa en la base de datos
    if (!order || !order.cliente_email || !order.cliente_nombre) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Credenciales de Supabase no configuradas en el entorno del servidor.")
      }
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) {
        throw new Error(`Error obteniendo la orden de la base de datos: ${error.message}`)
      }
      order = data
    }

    // Solo enviar el correo si el estatus es 'pagado'
    if (order.status !== 'pagado') {
      return new Response(JSON.stringify({ message: 'La orden no tiene estatus pagado', status: order.status }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (!RESEND_API_KEY) {
      throw new Error("La variable de entorno RESEND_API_KEY no está configurada.")
    }

    // Construcción de la tabla de items de compra en HTML
    let itemsHtml = ''
    if (order.items && Array.isArray(order.items)) {
      itemsHtml = order.items.map((item: any) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 12px 0; font-size: 14px; color: #333333; line-height: 1.5;">
            <div style="font-weight: 600; color: #111111;">${item.category || 'Playera'}</div>
            <div style="font-size: 12px; color: #777777; margin-top: 2px;">Color: ${item.color || 'N/A'} | Talla: ${item.size || 'N/A'}</div>
          </td>
          <td style="padding: 12px 0; text-align: center; font-size: 14px; color: #555555; font-weight: 500;">
            ${item.quantity}
          </td>
          <td style="padding: 12px 0; text-align: right; font-size: 14px; color: #111111; font-weight: 600;">
            $${Number(item.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
          </td>
        </tr>
      `).join('')
    } else {
      itemsHtml = `
        <tr style="border-bottom: 1px solid #f0f0f0;">
          <td colspan="3" style="padding: 12px 0; font-size: 14px; color: #777777; text-align: center;">
            Detalles de productos no disponibles.
          </td>
        </tr>
      `
    }

    const emailBody = {
      from: 'creativity.mx <ventas@creativity.mx>', // Modificable por dominio verificado en Resend
      to: [order.cliente_email, 'edu.cv87@gmail.com'],
      subject: `👕 ¡Pedido Confirmado! #${orderId.toString().slice(0, 8).toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmación de Pedido</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f7f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-collapse: collapse; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            <!-- Encabezado con gradiente oscuro estilo premium -->
            <tr>
              <td style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 40px 30px; text-align: center; border-bottom: 4px solid #10b981;">
                <span style="font-size: 44px; display: block; margin-bottom: 10px;">👕</span>
                <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px; text-transform: uppercase;">creativity.mx</h1>
                <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0; font-weight: 500; letter-spacing: 1px;">ROPA PREMIUM DE SUBLIMACIÓN</p>
              </td>
            </tr>
            <!-- Mensaje de agradecimiento -->
            <tr>
              <td style="padding: 35px 30px 20px 30px;">
                <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 10px;">¡Muchas gracias por tu compra, ${order.cliente_nombre}!</h2>
                <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0;">
                  Hemos recibido tu pago y estamos preparando tus prendas premium con la máxima calidad. A continuación, tienes el resumen detallado de tu pedido.
                </p>
              </td>
            </tr>
            <!-- Resumen de Pedido -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <table width="100%" style="border-collapse: collapse; background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #f3f4f6;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="color: #111827; font-size: 16px; font-weight: 700; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Detalles de la Orden</h3>
                      <table width="100%" style="border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                          <tr style="border-bottom: 1px solid #e5e7eb;">
                            <th style="text-align: left; padding-bottom: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Producto</th>
                            <th style="text-align: center; padding-bottom: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; width: 60px;">Cant.</th>
                            <th style="text-align: right; padding-bottom: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; width: 100px;">Precio</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                      </table>
                      <!-- Desglose de totales -->
                      <table width="100%" style="border-collapse: collapse; font-size: 14px; color: #4b5563;">
                        <tr>
                          <td style="padding: 6px 0;">Subtotal:</td>
                          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">$${Number(order.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0;">Costo de Envío:</td>
                          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">
                            ${Number(order.envio_costo) === 0 ? '<span style="color: #10b981;">Gratis</span>' : `$${Number(order.envio_costo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`}
                          </td>
                        </tr>
                        <tr style="border-top: 1px solid #e5e7eb;">
                          <td style="padding: 15px 0 0 0; font-size: 16px; font-weight: 700; color: #111827;">Total Pagado:</td>
                          <td style="padding: 15px 0 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #10b981;">$${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Datos de Envío -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <table width="100%" style="border-collapse: collapse; background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #f3f4f6;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="color: #111827; font-size: 16px; font-weight: 700; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Información de Envío</h3>
                      <p style="margin: 6px 0; font-size: 14px; color: #4b5563;"><strong style="color: #111827;">Dirección:</strong> ${order.direccion}</p>
                      <p style="margin: 6px 0; font-size: 14px; color: #4b5563;"><strong style="color: #111827;">Código Postal:</strong> ${order.codigo_postal}</p>
                      <p style="margin: 6px 0; font-size: 14px; color: #4b5563;"><strong style="color: #111827;">Teléfono de Contacto:</strong> ${order.cliente_telefono || 'No provisto'}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Pie de página informativo -->
            <tr>
              <td style="padding: 20px 30px 40px 30px; text-align: center; background-color: #fafbfb; border-top: 1px solid #f3f4f6;">
                <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                  Te enviaremos un correo electrónico con tu número de guía de rastreo tan pronto como la paquetería recolecte tu paquete.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 700; color: #111827;">creativity.mx</p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">Copyright © 2026 creativity.mx. Todos los derechos reservados.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    }

    console.log("Sending email to Resend...")
    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailBody),
    })

    let data = await res.json()
    console.log("Resend API response status:", res.status)
    console.log("Resend API response data:", JSON.stringify(data))

    // Si falla porque no está verificado (403 o mensaje de "testing emails"), intentamos enviar solo al vendedor
    if (!res.ok && (res.status === 403 || data.message?.includes('testing emails'))) {
      console.log("Destinatario no verificado en sandbox. Reintentando enviar únicamente al administrador (edu.cv87@gmail.com)...")
      const adminEmailBody = {
        ...emailBody,
        to: ['edu.cv87@gmail.com'],
        subject: `[ADMIN NOTIFICACIÓN] 👕 Nuevo Pedido #${orderId.toString().slice(0, 8).toUpperCase()}`,
      }

      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(adminEmailBody),
      })

      data = await res.json()
      console.log("Admin Resend API response:", JSON.stringify(data))
      
      if (res.ok) {
        data.warning = "El correo se envió únicamente a edu.cv87@gmail.com debido a las restricciones de Sandbox de Resend. Verifica tu dominio para enviar a cualquier cliente."
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: res.status,
    })

  } catch (error) {
    console.error("Error in Edge Function:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
