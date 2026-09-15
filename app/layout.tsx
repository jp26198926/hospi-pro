import type { Metadata } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { getAppSettings } from "@/lib/settings";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  return {
    title: settings.appName,
    description: settings.appTagline || "Role-Based Access Control System",
    icons: { icon: "/favicon.ico" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getAppSettings();
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
        {settings.appLogo && (
          <link rel="apple-touch-icon" href={settings.appLogo} />
        )}
      </head>
      <body className="min-h-full font-sans">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
