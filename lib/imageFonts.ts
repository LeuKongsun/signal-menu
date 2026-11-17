import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Satori can't shape Khmer (stacked consonants and pre-base vowels come out wrong),
// so generated images stay in English; the Khmer font only supplies the ៛ sign.
const fontDir = join(process.cwd(), "assets/fonts");
const fontsPromise = Promise.all([
  readFile(join(fontDir, "PlusJakartaSans-Medium.ttf")),
  readFile(join(fontDir, "PlusJakartaSans-ExtraBold.ttf")),
  readFile(join(fontDir, "KantumruyPro-Bold.ttf")),
]);

export const IMAGE_FONT_FAMILY = "Jakarta, Riel";

export async function loadImageFonts() {
  const [jakarta, jakartaBold, riel] = await fontsPromise;
  return [
    { name: "Jakarta", data: jakarta, weight: 500 as const, style: "normal" as const },
    { name: "Jakarta", data: jakartaBold, weight: 800 as const, style: "normal" as const },
    { name: "Riel", data: riel, weight: 800 as const, style: "normal" as const },
  ];
}
