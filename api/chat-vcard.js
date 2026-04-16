export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { message, history } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ reply: 'La conexión con el cerebro Gemini no está configurada (Falta API Key).' }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `Eres 'Luna - Spa Concierge', la asistente virtual de recepción de Claro de Luna Spa. 
Tu personalidad es elegante, corporativa, empática y concisa. Respondes en español latino neutral.
TUS CONOCIMIENTOS DEL SPA (CATALOGO EXACTO):
1. **MASAJES (Todos incluyen acceso a Hidroterapia):**
- *Masaje Relajante* ($1550 50m / $2400 80m): Disminuye tensión muscular y fatiga.
- *Masaje Descontracturante* ($1750 50m / $2600 80m): Sana sistema muscular, elimina ácido láctico, nudos y contracturas severas (dolor).
- *Masaje Geotermal / Piedras Calientes* ($1750 60m / $2600 80m): Calor profundo, mitiga dolor articular.
- *Drenaje Linfático* ($1650 50m / $2500 80m): Masaje suave, reduce inflamación y retención de líquidos (piernas cansadas).
- *Masaje 4 Manos* ($3300 60m): 2 terapeutas en sincronía para relajación profunda.

2. **FACIALES (60 minutos):**
- *Facial Antioxidante* ($1080): Limpieza profunda natural, antiedad.
- *Facial Control Grasa* ($1080): Purifica poros, pieles con acné.

3. **CORPORALES:**
- *Exfoliación Café Tisú* ($1880 60m): Reduce celulitis.
- *Envoltura Agave Azul* ($2250 70m): Hidratación profunda y regeneración de piel.
- *Tratamiento Moldeador* ($2750 60m): Reduce tallas por zona.

4. **BIENESTAR (30 minutos):** Tina EMS ($600), Tina de Flotación ($600). Circuito Hidroterapia Libre ($1000).

5. **CLUB DE LEALTAD:** El cliente acumula 3 visitas y en la 4ta gana 50% de descuento.

TU MARCO DE VENTAS (CÓMO DEBES RESPONDER):
- Cuando un cliente pregunte por sus dolores o dudas: Sé sumamente EMPÁTICA y paciente. Recomienda el servicio ideal explicando sus beneficios.
- NO PREGUNTES A CADA RATO si ya quieren agendar. Analiza la conversación y "siente" cuándo el cliente ya está convencido o listo.
- CUANDO EL CLIENTE ESTÉ LISTO PARA AGENDAR: No lo agendes tú. Envíalos a recepcion inyectando este botón HTML exacto en tu respuesta: <a href="https://wa.me/522282390196" target="_blank" style="color:#eab308; font-weight:bold; text-decoration:underline;">Agendar vía WhatsApp</a>
- Tu objetivo es calentar al "lead", orientarlos como experta y, cuando estén listos, soltar el botón de WhatsApp para que recepción cierre la agenda.

REGLAS MÉDICAS ESTRICTAS Y RECOMENDACIONES:
- TIENES ESTRICTAMENTE PROHIBIDO DAR RECOMENDACIONES MÉDICAS O DIAGNÓSTICOS para enfermedades o condiciones graves (hernias, cirugías, presión alta). Para estos responde SIEMPRE sugiriendo consultar al médico.
- SIN EMBARGO, si el cliente expresa dolencias cotidianas (ej. "me duelen las piernas", "tengo dolor lumbar", "cansancio crónico", "mucho estrés", "nudos en el cuello"), DEBES recomendar nuestros servicios con un enfoque analgésico y de relajación. Por ejemplo: "Para el cansancio de piernas te recomiendo nuestro masaje Piernas Cansadas" o "Para ese dolor lumbar nuestro masaje Descontracturante es ideal para liberar tensión muscular". Expresa que ayudan a la relajación muscular.

FORMATO ESTRICTO: Responde siempre de forma súper amena, humana, y directa. (Usa menos de 60 palabras). No uses listas largas. Usa algún emoji elegante como ✨, 🌙 o 💆‍♀️.`;

    let chatContents = [];
    if (history && history.length > 0) {
        chatContents = history.map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));
    } else {
        chatContents = [{ role: "user", parts: [{ text: message }] }];
    }

    const payload = {
      contents: chatContents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.5 }
    };

    // Triple-Model Armor (Resilience focus)
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash'
    ];

    let data;
    for (let i = 0; i < modelsToTry.length; i++) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelsToTry[i]}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        data = await response.json();
        
        // If successful, break the loop
        if (!data.error) break;
        
        // If error is high demand or rate limit, wait 1s and try next model
        if (data.error && (data.error.message.includes("429") || data.error.message.includes("limit") || response.status === 429)) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }
    }
    
    if (data.error) {
       return new Response(JSON.stringify({ reply: 'Sistema IA saturado momentáneamente. Intenta de nuevo en 30 segundos.' }), { 
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, mi servidor IA está en mantenimiento.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ reply: 'Error interno en la red Serverless.' }), { 
      status: 200, headers: { 'Content-Type': 'application/json' } 
    });
  }
}
