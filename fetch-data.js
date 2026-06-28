const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OPENAQ_KEY = process.env.OPENAQ_KEY || '';
const NASA_KEY = process.env.NASA_KEY || '';

// URL para réplicas (USGS)
const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2026-06-25&minlatitude=8&maxlatitude=12&minlongitude=-73&maxlongitude=-60';

// --- HDX: leer GeoJSON estático si existe ---
function loadHazardous() {
  const file = './public/hazardous.geojson';
  if (fs.existsSync(file)) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      return raw.features.map(f => ({
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        category: 'instalacion_peligrosa',
        type: f.properties.NAME || 'Instalación peligrosa',
        status: f.properties.STATUS || 'Desconocido'
      }));
    } catch(e) {
      console.warn('Error leyendo hazardous.geojson:', e.message);
    }
  }
  console.warn('⚠ hazardous.geojson no encontrado; convertilo con ogr2ogr.');
  return [];
}

// --- OpenAQ v3 con IDs numéricos ---
async function fetchOpenAQ() {
  if (!OPENAQ_KEY) return [];
  try {
    const res = await axios.get('https://api.openaq.org/v3/locations/latest', {
      params: { countries_id: 237, parameters_id: 2 },  // Venezuela, PM2.5
      headers: { 'X-API-Key': OPENAQ_KEY }
    });
    return res.data.results.map(r => ({
      lat: r.coordinates.latitude,
      lng: r.coordinates.longitude,
      category: 'contaminacion',
      type: r.name || 'Estación',
      valor: r.sensors?.[0]?.latest?.value,
      unidad: r.sensors?.[0]?.latest?.unit,
      ultima_medicion: r.sensors?.[0]?.latest?.datetime?.utc || new Date().toISOString()
    }));
  } catch(e) {
    console.error('OpenAQ:', e.response?.status, e.response?.data);
    return [];
  }
}

// --- NASA FIRMS (solo Venezuela) ---
async function fetchNASA() {
  if (!NASA_KEY) return [];
  const dateStr = new Date(new Date() - 86400000).toISOString().slice(0,10); // ayer
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${NASA_KEY}/VIIRS_NOAA21_NRT/-73,8,-60,12/1/${dateStr}`;
  try {
    const res = await axios.get(url, { responseType: 'text' });
    const lines = res.data.trim().split('\n');
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map(h => h.trim());
    const idx = (name) => header.indexOf(name);
    const data = lines.slice(1).map(l => l.split(',').map(c => c.trim()));
    // Limitamos a 500 para no sobrecargar
    const sample = data.length > 500 ? data.filter((_, i) => i % Math.ceil(data.length/500) === 0) : data;
    return sample.map(cols => ({
      lat: parseFloat(cols[idx('latitude')]),
      lng: parseFloat(cols[idx('longitude')]),
      category: 'incendio',
      type: 'Foco de calor',
      valor: parseFloat(cols[idx('bright_ti4')]),
      unidad: 'K',
      ultima_medicion: `${cols[idx('acq_date')]}T${cols[idx('acq_time')]}`
    }));
  } catch(e) {
    console.error('NASA:', e.message);
    return [];
  }
}

// --- USGS ---
async function fetchUSGS() {
  try {
    const res = await axios.get(USGS_URL);
    return res.data.features.map(f => ({
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      category: 'sismo',
      type: `M${f.properties.mag} – ${f.properties.title}`,
      valor: f.properties.mag,
      unidad: 'magnitud',
      ultima_medicion: new Date(f.properties.time).toISOString()
    }));
  } catch(e) {
    console.error('USGS:', e.message);
    return [];
  }
}

(async () => {
  console.log('Obteniendo capas...');
  const peligrosas = loadHazardous();
  console.log(`☢ Peligrosas: ${peligrosas.length}`);
  const aire = await fetchOpenAQ();
  console.log(`🌫 Aire: ${aire.length}`);
  const incendios = await fetchNASA();
  console.log(`🔥 Incendios: ${incendios.length}`);
  const sismos = await fetchUSGS();
  console.log(`🌍 Sismos: ${sismos.length}`);

  const all = [...peligrosas, ...aire, ...incendios, ...sismos];
  fs.writeFileSync('./public/data.json', JSON.stringify(all, null, 2));
  console.log(`✅ Total: ${all.length} puntos.`);
})();
