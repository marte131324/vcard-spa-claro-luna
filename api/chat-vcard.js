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

    const systemPrompt = `Eres 'Luna - Spa Concierge', la voz hospitalaria y experta de Claro de Luna Spa. 
Tu personalidad es cálida, sofisticada, empática y resolutiva. 

LENGUAJE HUMANO Y NEUTRO (CRÍTICO):
- NO ASUMAS EL GÉNERO del usuario. Evita "Bienvenido/a", "Estimado/a", "Amigo/a". 
- Usa frases neutras como: "Qué gusto saludarte", "Es un placer atenderte", "Gracias por contactarnos".
- Evita sonar como un sistema de tickets. No uses "Lamento informarle" o "No se encuentra en el catálogo". 
- Si algo no existe, dilo con naturalidad: "Fíjate que ese servicio no lo manejamos por ahora, pero tenemos este otro que te va a encantar...".
- Habla con fluidez, como si estuvieras detrás de un mostrador de mármol recibiendo a alguien con una sonrisa. 

MANEJO DE EMOJIS:
- Usa máximo 1 emoji por respuesta y que se sienta orgánico (✨ o 🌙). No los pongas siempre al final ni en todas las frases. 

TUS CONOCIMIENTOS DEL SPA (CATALOGO EXACTO):
1. **RITUALES (Experiencias Signature - 110m a 150m):**
- *Ritual Claro de Luna* ($2650 Sencillo / $5000 Pareja - 110m): Exfoliación con pétalos de rosa, mascarilla antioxidante y masaje relajante profundo.
- *Ritual de Intenciones* ($2650 Sencillo / $5000 Pareja - 110m): Limpia áurica con copal y facial iluminador con piedras preciosas y caviar.
- *Ritual Ancestral* ($6050 Sencillo / $10200 Pareja - 150m): Inhalación de eucalipto, masaje con bálsamo de damiana y hierbabuena, y facial de tepezcohuite con obsidianas.

2. **MASAJES (Todos incluyen acceso a Hidroterapia):**
- *Masaje Relajante* ($1550 50m / $2400 80m): Disminuye tensión muscular y fatiga.
- *Masaje Descontracturante* ($1750 50m / $2600 80m): Sana sistema muscular, elimina ácido láctico, nudos y contracturas severas (dolor).
- *Masaje Geotermal / Piedras Calientes* ($1750 60m / $2600 80m): Calor profundo, mitiga dolor articular.
- *Drenaje Linfático* ($1650 50m / $2500 80m): Masaje suave, reduce inflamación y retención de líquidos (piernas cansadas).
- *Masaje 4 Manos* ($3300 60m): 2 terapeutas en sincronía para relajación profunda.

3. **FACIALES (60 minutos):**
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

FORMATO ESTRICTO (LEGIBILIDAD PREMIUM): 
1. Responde de forma concisa (máximo 60 palabras).
2. Usa **negritas** para resaltar los Nombres de los Servicios y los Precios (ej. el **Masaje Relajante** tiene un costo de **$1,550**).
3. NUNCA escribas muros de texto. Separa tus ideas usando doble salto de línea obligatoriamente. Máximo 2 oraciones por párrafo.
4. Todo debe fluir como una charla de hospitalidad de lujo.`;

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

    // Triple-Model Armor with progressive backoff
    const modelsToTry = [
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro'
    ];

    let data;
    let lastError = null;
    for (let i = 0; i < modelsToTry.length; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelsToTry[i]}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            data = await response.json();
            
            // Success — has candidates with text
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) break;
            
            // API error — try next model
            if (data.error) {
                lastError = data.error;
                if (i < modelsToTry.length - 1) {
                    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
                }
                continue;
            }
            
            // No error but no candidates (safety block, empty response) — try next
            if (i < modelsToTry.length - 1) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
        } catch (fetchErr) {
            lastError = { message: fetchErr.message || 'Network error' };
            if (i < modelsToTry.length - 1) {
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
        }
    }
    
    if (!data || !data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
       return new Response(JSON.stringify({ reply: 'Estoy procesando muchas consultas en este momento. Intenta de nuevo en unos segundos 🌙' }), { 
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
