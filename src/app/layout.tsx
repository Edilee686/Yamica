import type { Metadata, Viewport } from "next";
import "./globals.css";
import { asset } from "@/lib/routes";

// Self-hosted so exports can embed exactly the same font files.
const FONT_FACES = `
@font-face{font-family:"Instrument Serif";src:url("${asset("/fonts/instrument-serif.woff2")}") format("woff2");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Instrument Serif";src:url("${asset("/fonts/instrument-serif-italic.woff2")}") format("woff2");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url("${asset("/fonts/instrument-sans.woff2")}") format("woff2");font-weight:400 700;font-style:normal;font-display:swap}`;

export const metadata: Metadata = {
  title: "Yamica Studio · Turn your inspiration into a collection",
  description: "Build moodboards, explore fabrics, customize garments, and bring your fashion ideas together in one creative studio.",
};

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // dir is set explicitly so a future Hebrew locale can switch to "rtl" here.
  return (
    <html lang="en" dir="ltr">
      <head>
        <style dangerouslySetInnerHTML={{ __html: FONT_FACES }} />
        <link rel="preload" href={asset("/fonts/instrument-serif.woff2")} as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href={asset("/fonts/instrument-sans.woff2")} as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
