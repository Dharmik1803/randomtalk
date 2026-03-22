import Link from 'next/link';
import { Video, MessageSquare, Users, Zap, Globe, Shield, UserCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex-1 flex flex-col w-full text-[#fafafa]">
      
      {/* --- HERO SECTION --- */}
      <section className="relative flex flex-col items-center pt-10 pb-20 px-4">
        
        {/* Top Ad Placeholder */}
        <div className="w-full max-w-[728px] h-[90px] border border-zinc-800/80 bg-zinc-900/40 rounded-xl flex flex-col items-center justify-center text-xs text-zinc-600 mb-16 mx-auto">
          <span className="font-semibold tracking-widest uppercase mb-1">Advertisement</span>
          <span>leaderboard</span>
        </div>

        {/* Online Pill */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 mb-8 shadow-sm">
           <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
           <span className="text-xs font-semibold text-cyan-400">10,432 users online right now</span>
        </div>

        {/* Headlines */}
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Meet Someone <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">New.</span>
          </h1>
          
          <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Anonymous 1-on-1 video chat. No signup required. Start instantly and connect with strangers from around the world in milliseconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Link href="/chat" className="px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold text-[15px] shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
              <Video className="w-4 h-4 fill-black" /> Start Video Chat
            </Link>
            <Link href="/chat?mode=text" className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl font-semibold text-[15px] transition-all flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Text Only
            </Link>
          </div>
        </div>
      </section>

      {/* --- STATS STRIP --- */}
      <section className="border-y border-zinc-800/50 bg-[#09090b]/50 backdrop-blur-sm py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-zinc-800/50">
           <div className="flex flex-col items-center">
             <Users className="w-6 h-6 text-cyan-400 mb-3" />
             <h3 className="text-3xl font-extrabold pb-1">10k+</h3>
             <p className="text-[10px] tracking-widest uppercase text-zinc-500 font-bold">Online Now</p>
           </div>
           <div className="flex flex-col items-center pt-8 md:pt-0">
             <Zap className="w-6 h-6 text-purple-400 mb-3" />
             <h3 className="text-3xl font-extrabold pb-1">500k</h3>
             <p className="text-[10px] tracking-widest uppercase text-zinc-500 font-bold">Chats Today</p>
           </div>
           <div className="flex flex-col items-center pt-8 md:pt-0">
             <Globe className="w-6 h-6 text-blue-500 mb-3" />
             <h3 className="text-3xl font-extrabold pb-1">150</h3>
             <p className="text-[10px] tracking-widest uppercase text-zinc-500 font-bold">Countries</p>
           </div>
        </div>
      </section>

      {/* --- CONTENT SECTION (FEATURES & HOW IT WORKS) --- */}
      <section className="bg-[#0c0c0e] py-24 pb-32">
        <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row gap-16">
          
          {/* Left Column (Main content) */}
          <div className="flex-1 space-y-24">
            
            {/* Why RandomChat? */}
            <div id="features" className="space-y-8">
              <h2 className="text-3xl font-bold tracking-tight">Why RandomChat?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-[#121214] border border-zinc-800/60 rounded-2xl hover:bg-[#151518] transition">
                  <div className="w-10 h-10 bg-cyan-950/30 rounded-lg flex items-center justify-center mb-4 border border-cyan-900/30">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Instant Match</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">Get paired with a random stranger in under 2 seconds using our global edge network.</p>
                </div>

                <div className="p-6 bg-[#121214] border border-zinc-800/60 rounded-2xl hover:bg-[#151518] transition">
                  <div className="w-10 h-10 bg-purple-950/30 rounded-lg flex items-center justify-center mb-4 border border-purple-900/30">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">100% Anonymous</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">No account needed. Your privacy is protected with peer-to-peer WebRTC encryption.</p>
                </div>

                <div className="p-6 bg-[#121214] border border-zinc-800/60 rounded-2xl hover:bg-[#151518] transition">
                  <div className="w-10 h-10 bg-blue-950/30 rounded-lg flex items-center justify-center mb-4 border border-blue-900/30">
                    <Video className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Ultra-Low Latency</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">Experience seamless video and audio with our specialized media servers.</p>
                </div>

                <div className="p-6 bg-[#121214] border border-zinc-800/60 rounded-2xl hover:bg-[#151518] transition">
                  <div className="w-10 h-10 bg-green-950/30 rounded-lg flex items-center justify-center mb-4 border border-green-900/30">
                    <UserCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Safe & Moderated</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">AI-powered content moderation works 24/7 to keep the community safe.</p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div id="how-it-works" className="space-y-8">
              <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-5 p-5 bg-[#121214] border border-zinc-800/60 rounded-2xl">
                  <div className="w-8 h-8 rounded-full border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center text-cyan-400 text-sm font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-bold mb-1">Click Start</h4>
                    <p className="text-sm text-zinc-400">No registration required. Just click start to enter the matchmaking pool.</p>
                  </div>
                </div>

                <div className="flex items-start gap-5 p-5 bg-[#121214] border border-zinc-800/60 rounded-2xl">
                  <div className="w-8 h-8 rounded-full border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center text-cyan-400 text-sm font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-bold mb-1">Get Matched</h4>
                    <p className="text-sm text-zinc-400">Our algorithm finds an available user with similar interests in milliseconds.</p>
                  </div>
                </div>

                <div className="flex items-start gap-5 p-5 bg-[#121214] border border-zinc-800/60 rounded-2xl">
                  <div className="w-8 h-8 rounded-full border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center text-cyan-400 text-sm font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-bold mb-1">Start Chatting</h4>
                    <p className="text-sm text-zinc-400">Connection established. If you don't vibe, just click Next to instantly meet someone else.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Ads) */}
          <div className="w-full lg:w-80 shrink-0 space-y-6 pt-16 mt-0">
             {/* Medium Rectangle Ad */}
             <div className="w-full aspect-square md:aspect-auto md:h-[250px] border border-zinc-800/80 bg-zinc-900/40 rounded-2xl flex flex-col items-center justify-center text-xs text-zinc-600">
                <span className="font-semibold tracking-widest uppercase mb-1">Advertisement</span>
                <span>medium rectangle</span>
             </div>

             <div className="w-full p-6 bg-[#121214] border border-zinc-800/60 rounded-2xl text-center">
                <h4 className="font-bold mb-3">Premium Features?</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">RandomChat is and always will be 100% free. Supported by ads.</p>
             </div>
          </div>
          
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="w-full bg-[#09090b] border-t border-zinc-800/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
             <Video className="w-4 h-4 text-zinc-400" />
             <span className="font-bold text-zinc-300">RandomChat</span>
           </div>
           
           <div className="flex flex-wrap gap-6 text-xs text-zinc-500">
              <a href="#" className="hover:text-white transition">Terms of Service</a>
              <a href="#" className="hover:text-white transition">Privacy Policy</a>
              <a href="#" className="hover:text-white transition">Community Guidelines</a>
              <a href="#" className="hover:text-white transition">Contact</a>
           </div>

           <p className="text-xs text-zinc-600">© 2026 RandomChat. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
