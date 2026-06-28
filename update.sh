#!/bin/bash
# Obtiene datos frescos y los sube al repo para que Vercel los despliegue
cd ~/ve-emergency-map
node fetch-data.js
git add public/data.json
git commit -m "Actualización de datos $(date -Iminutes)" || echo "Sin cambios que commitear"
git push origin main
