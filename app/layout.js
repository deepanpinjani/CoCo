import { Inter, Playfair_Display, Dancing_Script } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const dancing = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
});

export const metadata = {
  title: "Grid & Drip | Café",
  description: "A cinematic, scroll-driven web experience for waffles and pancakes.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${dancing.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">{children}</body>
    </html>
  );
}
