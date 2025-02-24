import Header from "@/app/components/Header";
import "./globals.css";
import { Poppins } from "next/font/google"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"], // Choose font weights you need
  variable: "--font-poppins", // Set a CSS variable
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
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
