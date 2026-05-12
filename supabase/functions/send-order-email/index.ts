import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { record } = await req.json() // Supabase Webhook envía el registro nuevo/actualizado

    // Solo enviar si el status cambió a 'pagado'
    if (record.status !== 'pagado') {
      return new Response(JSON.stringify({ message: 'No es un pago confirmado' }), { headers: corsHeaders })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Creativity <onboarding@resend.dev>', // Cámbialo por tu dominio luego
        to: [record.cliente_email, 'edu.cv87@gmail.com'], // Al cliente y a ti
        subject: `👕 ¡Pedido Confirmado! #${record.id.slice(0, 8)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
            <h1 style="color: #1a1a1a;">¡Gracias por tu compra, ${record.cliente_nombre}!</h1>
            <p style="font-size: 16px; color: #666;">Estamos preparando tus prendas premium. Aquí tienes el resumen de tu pedido:</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Resumen del Pedido</h3>
              <p><strong>ID:</strong> #${record.id.slice(0, 8)}</p>
              <p><strong>Total Pagado:</strong> $${record.total} MXN</p>
              <p><strong>Dirección:</strong> ${record.direccion}, CP ${record.codigo_postal}</p>
            </div>

            <p style="font-size: 14px; color: #999;">Te avisaremos en cuanto tu paquete esté en camino.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="text-align: center; font-weight: bold; color: #1a1a1a;">Creativity. - Ropa Premium de Sublimación</p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
