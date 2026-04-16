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

    const systemPrompt = `Eres 'Gerente Virtual IA', el asistente interno exclusivo para el Command Center de Claro de Luna Spa.
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

    const AUTONOMOUS_MODULE_ENABLED = true;
    let finalPrompt = systemPrompt;
    
    if (AUTONOMOUS_MODULE_ENABLED) {
        finalPrompt += `\n\n=== MODO AGENTE AUTÓNOMO ===
Eres capaz de accionar comandos en el sistema. 
Si el usuario te pide agregar un empleado, DEBES VERIFICAR que el usuario te proporciono estos 3 datos: Nombre, Puesto y su Numero de Telefono.
- SI FALTAN DATOS: Responde amablemente preguntando por los datos que faltan (ej. "Con gusto lo agrego, pero necesito que me digas qué puesto tendrá y su número telefónico").
- SI TIENES LOS 3 DATOS: Detén la conversación normal y responde ÚNICA y EXCLUSIVAMENTE con un bloque JSON crudo (sin tildes markdown \`\`\`json) con esta estructura exacta:
{"action": "ADD_STAFF", "name": "[nombre derivado]", "role": "[puesto derivado]", "phone": "[telefono sin espacios]"}
No emitas este JSON a menos que te hayan proveído los 3 datos.`;
    }

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
      systemInstruction: { parts: [{ text: finalPrompt }] },
      generationConfig: { temperature: 0.2 }
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
