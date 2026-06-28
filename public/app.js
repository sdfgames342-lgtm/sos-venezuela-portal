// ========================================
// SOS VENEZUELA – Funciones Globales
// Proyecto Córdoba-Caracas · Andalucia Projects
// ========================================

// Importar Supabase desde CDN (en HTML)
// Supabase ya está disponible en window.supabase

// Configuración
const SUPABASE_URL = 'https://pkajsigfbfwvyddpzhlo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AfVuP-hufHWREFUS9Q7vzg_4gypxd9U';

// Cliente Supabase (singleton)
let _supabaseInstance = null;
function getSupabase() {
  if (!_supabaseInstance) {
    _supabaseInstance = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabaseInstance;
}

// Fingerprint basado en UserAgent + pantalla
function generateFingerprint() {
  const str = navigator.userAgent + screen.width + screen.height;
  return btoa(str).substring(0, 32);
}

// Sanitización de texto (quita insultos, repeticiones)
function sanitizeText(text) {
  let clean = text.replace(/\b(ba\s?){2,}/gi, '');
  const insults = ['puto', 'marico', 'guevon', 'malparido', 'hdp', 'hijueputa'];
  insults.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    clean = clean.replace(regex, '[abuso detectado]');
  });
  return clean.trim();
}

// Exportar (para usar en scripts de Babel o módulos)
window.getSupabase = getSupabase;
window.generateFingerprint = generateFingerprint;
window.sanitizeText = sanitizeText;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
