import fs from "node:fs";
import path from "node:path";
import InteractiveScript from "./InteractiveScript";
import { renderFindsSection, sanitizeFind } from "@/lib/finds";

export const revalidate = 3600;

function readFinds() {
  const filePath = path.join(process.cwd(), "content", "finds.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(parsed)) return [];
    const today = new Date().toISOString().slice(0, 10);
    return parsed.map((find) => sanitizeFind(find, today)).filter(Boolean);
  } catch {
    return [];
  }
}

function buildPage() {
  const bodyPath = path.join(process.cwd(), "content", "body.html");
  const bodyHtml = fs.readFileSync(bodyPath, "utf8");
  return bodyHtml.replace("<!--FRESH_FINDS-->", renderFindsSection(readFinds()));
}

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: buildPage() }} />
      <InteractiveScript />
    </>
  );
}
