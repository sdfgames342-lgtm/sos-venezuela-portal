// fetch-data.js
const axios = require('axios');
const fs = require('fs');

/* 
 * URLs reales a reemplazar con los datasets de HDX que correspondan.
 * Para pruebas podés usar cualquier GeoJSON público o descargar de:
 * https://data.humdata.org/ y buscar "earthquake Venezuela 2026"
 */
const OCHA_URL = 'https://data.humdata.org/dataset/.../resource/.../download/facilities.geojson';
const DAMAGE_URL = 'https://data.humdata.org/dataset/.../resource/.../download/damage.geojson';
const AIR_URL = 'https://api.openaq.org/v2/latest?limit=100&country=VE&parameter=pm25';

// Si no tenés API key de OpenAQ, podés omitir esta capa
const OPENAQ_KEY = process.env.OPENAQ_KEY || '';

async function fetchJSON(url, headers = {}) {
  try {
    const { data } = await axios.get(url, { headers, timeout: 10000 });
    return data;
  } catch (e) {
    console.error(`Error en ${url}: ${e.message}`);
    return null;
  }
}

function transformGeoJSON(geojson, category, extraFields = {}) {
  if (!geojson || !geojson.features) return [];
  return geojson.features.map(f => ({
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    category,
    type: f.properties.name || f.properties.facility_type || extraFields.type || 'Punto',
    status: f.properties.operational_status || extraFields.status || 'sin datos',
    grade: f.properties.damage_grade || extraFields.grade || '',
    valor: extraFields.valor,
    unidad: extraFields.unidad,
    ultima_medicion: extraFields.ultima_medicion || new Date().toISOString()
  }));
}

(async () => {
  // --- Capa 1: Infraestructura humanitaria ---
  const ochaData = await fetchJSON(OCHA_URL);
  const infra = transformGeoJSON(ochaData, 'infraestructura', { type: 'Centro de auxilio' });

  // --- Capa 2: Daños estructurales (Copernicus EMS, etc.) ---
  const damageData = await fetchJSON(DAMAGE_URL);
  const damage = transformGeoJSON(damageData, 'daño_estructural', { type: 'Edificio' });

  // --- Capa 3: Calidad del aire (OpenAQ, requiere API key) ---
  let air = [];
  if (OPENAQ_KEY) {
    const airData = await fetchJSON(AIR_URL, { 'X-API-Key': OPENAQ_KEY });
    if (airData && airData.results) {
      air = airData.results.map(r => ({
        lat: r.coordinates.latitude,
        lng: r.coordinates.longitude,
        category: 'contaminacion',
        type: r.location,
        status: '',
        grade: '',
        valor: r.value,
        unidad: r.unit,
        ultima_medicion: r.lastUpdated
      }));
    }
  }

  const combined = [...infra, ...damage, ...air];
  fs.writeFileSync('./public/data.json', JSON.stringify(combined, null, 2));
  console.log(`✅ Datos fusionados: ${combined.length} puntos.`);
})();
