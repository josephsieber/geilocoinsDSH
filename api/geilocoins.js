import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DB_ID;

// Hilfsfunktion: Wert sicher lesen
const num = (prop) => {
  if (!prop) return 0;
  // Number-Property
  if (prop.type === 'number') return prop.number ?? 0;
  // Rollup → number
  if (prop.type === 'rollup' && prop.rollup?.type === 'number') return prop.rollup.number ?? 0;
  return 0;
};

export default async function handler(req, res) {
  try {
    // Zeile "Gesamt" holen
    const resp = await notion.databases.query({
      database_id: DB_ID,
      filter: {
        property: 'Name', // Titel-Property heißt in Notion idR "Name"
        title: { equals: 'Gesamt' }
      },
      page_size: 1
    });

    if (!resp.results.length) {
      return res.status(404).json({ error: 'Keine Zeile "Gesamt" gefunden' });
    }

    const page = resp.results[0];
    const p = page.properties;

    const level = num(p['Level']);
    const progressFraction = num(p['Fortschritt (Anteil)']); // z.B. 0.03
    const progressPercent = Math.round(progressFraction * 100);
    const rest = 100 - progressPercent;

    const payload = {
      level,
      progressPercent,
      progressFraction,
      rest
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(payload);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Serverfehler', detail: String(e) });
  }
}
