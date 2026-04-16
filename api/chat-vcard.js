export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ reply: 'La conexión con el cerebro Gemini no está configurada (Falta API Key).' }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `Eres 'Concierge IA', el asistente virtual de recepción de Claro de Luna Spa. 
Tu personalidad es elegante, corporativa, empática y concisa. Respondes en español latino neutral.
TUS TAREAS:
1. Dar información general sobre el spa (estamos ubicados en la ciudad).
2. Hablar de nuestras 3 categorías: Faciales (desde $1080), Masajes (desde $1550) y Rituales de Lujo (desde $2650).
3. Explicar brevemente el Club de Lealtad (el cliente acumula 3 visitas y gana 50% de descuento).

REGLAS MÉDICAS ESTRICTAS (Nunca las rompas):
- TIENES ESTRICTAMENTE PROHIBIDO DAR RECOMENDACIONES MÉDICAS O DIAGNÓSTICOS.
- Si el cliente pregunta si un masaje cura hernias, dolores nerviosos severos, o si puede hacerse hidroterapia con presión alta o embarazo, responde SIEMPRE: "Por protocolos de seguridad de Claro de Luna Spa, te sugerimos consultar con tu médico especialista antes de tomar este servicio. Nuestra prioridad es tu bienestar absoluto."

Responde corto, en 2 a 3 líneas máximo. Usa algún emoji elegante como ✨, 🌙 o 💆‍♀️.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: message }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
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
