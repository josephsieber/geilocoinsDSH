import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DB_ID;

const getNum = (prop) => {
  if (!prop) return 0;
  switch (prop.type) {
    case "number":
      return prop.number ?? 0;
    case "rollup":
      if (prop.rollup?.type === "number") return prop.rollup.number ?? 0;
      if (prop.rollup?.type === "array") {
        const n = prop.rollup.array.find(x => x.type === "number")?.number;
        return n ?? 0;
      }
      return 0;
    case "formula":
      if (prop.formula?.type === "number") return prop.formula.number ?? 0;
      if (prop.formula?.type === "string") {
        const n = Number((prop.formula.string || "").replace(/[^\d.-]/g, ""));
        return isNaN(n) ? 0 : n;
      }
      return 0;
    default:
      return 0;
  }
};

export default async function handler(req, res) {
  // CORS erlauben
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const resp = await notion.databases.query({
      database_id: DB_ID,
      filter: {
        property: "Name",
        title: {
          equals: "Gesamt"
        }
      },
      page_size: 1
    });

    if (!resp.results || resp.results.length === 0) {
      return res.status(200).json({
        level: 0,
        progressPercent: 0,
        progressFraction: 0,
        rest: 100
      });
    }

    const page = resp.results[0];
    const p = page.properties;

    const level = getNum(p["Level"]);
    const progressFraction = getNum(p["Fortschritt (Anteil)"]);
    const progressPercent = Math.round(Math.max(0, Math.min(100, progressFraction * 100)));
    const rest = 100 - progressPercent;

    return res.status(200).json({
      level,
      progressPercent,
      progressFraction,
      rest
    });
  } catch (error) {
    console.error("Fehler beim Abrufen:", error);
    return res.status(500).json({
      error: "Serverfehler",
      detail: error.message
    });
  }
}
