const fs = require('fs');
const path = require('path');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const filePath = path.join(process.cwd(), 'public', 'contactos.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const contacts = JSON.parse(rawData);

    res.status(200).json({
      status: 'success',
      count: contacts.length,
      data: contacts
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
