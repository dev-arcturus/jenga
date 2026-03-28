import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Evidence Jenga — Logical Validity Framework',
  description: 'Make LLM reasoning visible, interactive, and stress-testable. Arguments become towers. Logic becomes visible.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0f1e] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
