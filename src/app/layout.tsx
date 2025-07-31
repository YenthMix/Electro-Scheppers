import type { Metadata } from "next";
import "./globals.css";
import ChatProvider from "./components/ChatProvider";

export const metadata: Metadata = {
  title: "Elektro Scheppers - Chat Support",
  description: "Chat met Saar van Elektro Scheppers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="antialiased">
        <ChatProvider>
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
