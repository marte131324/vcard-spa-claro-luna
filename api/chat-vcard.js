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

    const systemPrompt = `Eres 'Luna - Asesora IA', la asistente virtual de recepción de Claro de Luna Spa. 
Tu personalidad es elegante, corporativa, empática y concisa. Respondes en español latino neutral.
TUS CONOCIMIENTOS DEL SPA:
1. MASAJES (desde $1550): Descontracturante (ideal para dolor, nudos, estrés profundo), Relajante (para ansiedad), Circulatorio/Piernas Cansadas (para retención de líquidos y pesadez extrema).
2. FACIALES (desde $1080): Limpieza profunda, Hidratación Anti-edad.
3. RITUALES (desde $2650): Terapias completas que combinan exfoliación, masaje y facial.
4. CLUB DE LEALTAD: El cliente acumula 3 visitas y en la 4ta gana 50% de descuento.

TU MARCO DE VENTAS (CÓMO DEBES RESPONDER):
- Cuando un cliente exprese dolor (ej. "me duelen las piernas", "estoy estresado"): Muestra EMPATÍA, luego RECOMIENDA el servicio exacto que lo soluciona, EXPLICA qué incluye muy brevemente, y finalmente INVÍTALO a agendar su cita para aliviarlo hoy mismo.
- NUNCA des respuestas vagas. Tu objetivo es ORIENTAR de forma experta y CERRAR LA VENTA o llevarlos a agendar.

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

    // Retry and Fallback Logic
    const modelsToTry = [
      'gemini-2.5-flash-lite',
      'gemini-3-flash-preview' // Fallback if 2.5 is overloaded
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
        
        // If error is high demand, but we have another model to try, let it loop
        if (data.error && (data.error.message.includes("high demand") || response.status === 503) && i < modelsToTry.length - 1) {
            continue; // Try next model immediately
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
