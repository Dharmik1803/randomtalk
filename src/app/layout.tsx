import type { Metadata } from 'next';
import './globals.css';
import { Video } from 'lucide-react';

export const metadata: Metadata = {
  title: 'RandomChat - Meet Someone New',
  description: 'Anonymous 1-on-1 video chat. No signup required.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#09090b] text-[#fafafa] flex flex-col min-h-screen selection:bg-cyan-500/30">
        
        {/* Navigation Header */}
        <header className="w-full bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 border-b border-transparent">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg">
                <Video className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">RandomChat</span>
            </div>
            
            {/* Nav Links */}
            <nav className="hidden md:flex gap-8 items-center text-sm font-medium text-zinc-400">
              <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#trust" className="hover:text-white transition-colors">Trust & Safety</a>
            </nav>
          </div>
        </header>

        <main className="flex-1 flex flex-col w-full">
          {children}
        </main>
        
      </body>
    </html>
  );
}
