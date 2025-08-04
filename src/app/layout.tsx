import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import ChatProvider from "./components/ChatProvider";
import BackendStatusChecker from "./components/BackendStatusChecker";

export const metadata: Metadata = {
  title: "Elektro Scheppers - Login",
  description: "Login voor Elektro Scheppers systeem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="antialiased">
        <AuthProvider>
          <ChatProvider>
            {children}
            <BackendStatusChecker />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
