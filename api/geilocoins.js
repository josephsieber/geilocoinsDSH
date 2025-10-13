import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DB_ID;

// Hilfsfunktion: liest Zahlen robust aus (egal ob Number, Formula oder Rollup)
const getNum = (prop) => {
  if (!prop) return 0;

  switch (prop.type) {
    case 'number':
      return prop.number ?? 0;

    case 'rollup':
      if (prop.rollup?.type === 'number') return prop.rollup.number ?? 0;
      if (prop.rollup?.type === 'array') {
        const n = prop.rollup.array.find(x => x.type === 'number')?.number;
        return n ?? 0;
      }
      return 0;

    case 'formula':
      if (prop.formula?.type === 'number') return prop.formula.number ?? 0;
      if (prop.formula?.type === 'string') {
        const n = Number((prop.formula.string || '').replace(/[^\d.-]/g, ''));
        return isNaN(n) ? 0 : n;
      }
      return 0;

    case 'rich_text':
      return Number(prop.rich_text.map(t => t.plain_text).join('').replace(/[^\d.-]/g, '')) || 0;

    default:
      return 0;
  }
};

// Standard-Handler
export default async function handler(req, res) {
  try {
    const query = await notion.databases.query({
      database_id: databaseId,
    });

    if (!query.results || query.results.length === 0) {
      return res.status(200).json({ error: "Keine Daten gefunden" });
    }

    const page = query.results[0];
    const p = page.properties;

    const level = getNum(p["Level"]);
    const progressFraction = getNum(p["Fortschritt (Anteil)"]);
    const progressPercent = Math.round(Math.max(0, Math.min(100, progressFraction * 100)));
    const rest = 100 - progressPercent;

    return res.status(200).json({
      level,
      progressPercent,
      progressFraction,
      rest,
    });
  } catch (error) {
    console.error("Fehler beim Abrufen:", error);
    return res.status(500).json({
      error: "Serverfehler",
      detail: error.message,
    });
  }
}
