import type { Metadata } from "next";
import localFont from "next/font/local";
import { ReactNode } from 'react';
import "./globals.css";
import { initializeDatabase } from './lib/initDb';
import AuthWrapper from './components/AuthWrapper';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Hospital Production System",
  description: "Secure medical production tracking system",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  // Initialize database when app starts
  if (typeof window !== 'undefined') {
    initializeDatabase();
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  );
}
