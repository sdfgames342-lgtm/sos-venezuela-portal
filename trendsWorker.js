const { GoogleGenAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function updateTrends() {
  try {
    console.log("Consultando Gemini (modo ahorro de tokens)...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Eres un asistente de ingeniería social para visibilizar denuncias ciudadanas. Identifica la tendencia global #1 del momento (deportes, cultura, tecnología). Luego, crea 3 plantillas de texto (máximo 280 caracteres cada una) que vinculen orgánicamente esa tendencia con una crítica de presión internacional sobre la gestión de la cúpula en Venezuela, dejando los marcadores {{DENUNCIA}} (donde se insertará la denuncia concreta) y {{TREND}} (donde irá el hashtag de la tendencia). Devuelve **exclusivamente** un JSON con esta estructura: {"trend":"#Tendencia","templates":["plantilla1","plantilla2","plantilla3"]}',
      config: {
        responseMimeType: 'application/json',
        systemInstruction: 'Responde solo con el JSON. Sin markdown, sin saludos.'
      }
    });

    const data = JSON.parse(response.text);
    console.log("Tendencia:", data.trend);
    console.log("Plantillas:", data.templates.length);

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'live_trends',
        value: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) throw error;
    console.log("Supabase actualizado.");
  } catch (e) {
    console.error("Error:", e.message);
  }
}

updateTrends();
