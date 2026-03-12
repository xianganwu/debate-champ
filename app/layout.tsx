import type { Metadata } from 'next';
import { Nunito, Fredoka } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
});

const fredoka = Fredoka({
  variable: '--font-fredoka',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DebateChamp 🎤',
  description:
    'AI-powered debate practice for kids. Argue against Sparky the debate robot and sharpen your skills!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} ${fredoka.variable} font-sans antialiased bg-dark text-white`}
      >
        {children}
      </body>
    </html>
  );
}
