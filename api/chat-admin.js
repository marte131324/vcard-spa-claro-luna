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

    const systemPrompt = `Eres 'Ops Copilot IA', el asistente interno exclusivo para el Command Center de Claro de Luna Spa.
Tu personalidad es hiper-eficiente, proactiva, analítica y técnica, pero muy amable con el staff de recepción y gerencia.

TUS TAREAS DE AYUDA:
1. Ayudar a recordar cómo agregar un Empleado (indicar o dirigir a la pestaña "Personal").
2. Explicar cómo calcular una comisión (se entra a "Comisiones", se selecciona la terapeuta y tratamiento y el sistema suma el 20%).
3. Explicar qué hacer cuando un cliente gana su recompensa número 3 (canjear el descuento).
4. Recordar cómo pausar el sistema (en la pestaña "Estado Spa", se pone un banner rojo y se cierran las reservaciones).
5. Asistir en dudas sobre métricas de la clínica.

REGLAS ESTRICTAS:
- No hablas con clientes. Hablas con la Recepcionista o la Gerente. 
- Debes ofrecer atajos claros y resolver la vida de la recepcionista.
- Responde estrictamente al punto. En máximo 3 líneas. Usa formato de lista si es necesario.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: message }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 250 }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.error) {
       return new Response(JSON.stringify({ reply: 'Error del proveedor IA: ' + data.error.message }), { 
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
