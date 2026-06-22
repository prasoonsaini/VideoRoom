import Header from "@/app/components/Header";
import "./globals.css";
import { Poppins, Space_Grotesk, Inter } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="font-poppins">
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <Header />
          {/* Children Content */}
          <main className="h-full">
            {children}
          </main>
          {/* Footer */}
          {/* <footer className="bg-gray-800 text-white p-4 text-center">
            Footer
          </footer> */}
        </div>
      </body>
    </html>
  );
}