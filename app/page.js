import fs from "node:fs";
import path from "node:path";
import InteractiveScript from "./InteractiveScript";

function getBodyHtml() {
  const filePath = path.join(process.cwd(), "content", "body.html");
  return fs.readFileSync(filePath, "utf8");
}

export default function Home() {
  const bodyHtml = getBodyHtml();
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <InteractiveScript />
    </>
  );
}
