"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Peer, { MediaConnection, DataConnection } from "peerjs";
import { Camera, CameraOff, Mic, MicOff, SkipForward, Search, X, Send, Flag, TriangleAlert, Video } from "lucide-react";

type PermissionState = 'prompt' | 'granted' | 'denied' | 'text_only';
type Message = { id: string; sender: 'me' | 'stranger' | 'system'; text: string };

const interests = ["Anime", "Gaming", "Music", "Movies", "Sports", "Art", "Tech", "Travel", "Food", "Fitness", "Books", "Memes"];

export default function ChatPage() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [isTextOnly, setIsTextOnly] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  
  const [searchTimer, setSearchTimer] = useState(0);
  const [chatTimer, setChatTimer] = useState(0);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // References
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  
  const searchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const matchPollRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("mode") === "text") {
        handleTextOnlyMode();
      }
    }
    
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      peerRef.current?.destroy();
      stopTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream, status]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stopTimers = () => {
    if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
    if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    if (matchPollRef.current) clearInterval(matchPollRef.current);
  };

  const startSearchTimer = () => {
    stopTimers();
    setSearchTimer(0);
    searchIntervalRef.current = setInterval(() => setSearchTimer(p => p + 1), 1000);
  };

  const startChatTimer = () => {
    stopTimers();
    setChatTimer(0);
    chatIntervalRef.current = setInterval(() => setChatTimer(p => p + 1), 1000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextOnlyMode = () => {
    setPermissionState('text_only');
    setIsTextOnly(true);
    setStatus("Finding your match...");
    startSearchTimer();
    initPeer(null, "text");
  };

  const requestPermissions = async () => {
    try {
      const _stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(_stream);
      setPermissionState('granted');
      if (localVideoRef.current) localVideoRef.current.srcObject = _stream;
      setStatus("Finding your match...");
      startSearchTimer();
      initPeer(_stream, "video");
    } catch (err: any) {
      console.error("Error accessing media devices", err);
      setPermissionState('denied');
      handleTextOnlyMode();
    }
  };

  const initPeer = (_stream: MediaStream | null, mode: "video" | "text") => {
    // Basic STUN configuration for better connectivity
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ]
      }
    });
    peerRef.current = peer;

    peer.on("open", (id) => {
      console.log(`[Peer] Open with ID: ${id}`);
      setStatus("Searching global pool...");
      findMatch(id, mode, _stream);
    });

    peer.on("call", (incomingCall) => {
      console.log(`[Peer] Incoming call from peer!`);
      setStatus("Match Found!");
      if (matchPollRef.current) clearInterval(matchPollRef.current);
      
      if (_stream) {
        incomingCall.answer(_stream);
      } else {
        incomingCall.answer();
      }
      setupCallListeners(incomingCall);
    });

    peer.on("connection", (conn) => {
      console.log(`[Peer] Incoming data connection from peer!`);
      setStatus("Match Found!");
      if (matchPollRef.current) clearInterval(matchPollRef.current);
      setupDataListeners(conn);
    });

    peer.on("error", (err) => {
      console.error(`[Peer] Error:`, err);
      setStatus("Connection Error. Refreshing...");
    });
  };

  const findMatch = async (id: string, mode: "video" | "text", _stream: MediaStream | null) => {
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        body: JSON.stringify({ peerId: id, mode }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(`Error: ${data.error || "Failed searching"}`);
        if (data.details) console.error("[Match] API Detail:", data.details);
        return;
      }

      if (data.match && data.peerId) {
        console.log(`[Match] Match found for ${id} with partner: ${data.peerId}`);
        if (matchPollRef.current) clearInterval(matchPollRef.current);
        setStatus("Match Found!");
        
        // Initiate P2P connections
        if (mode === "video" && _stream) {
          console.log(`[Peer] Calling ${data.peerId}...`);
          const outgoingCall = peerRef.current!.call(data.peerId, _stream);
          setupCallListeners(outgoingCall);
        }
        
        console.log(`[Peer] Connecting data to ${data.peerId}...`);
        const conn = peerRef.current!.connect(data.peerId);
        setupDataListeners(conn);
        
        setTimeout(() => {
          setStatus("Connected!");
          startChatTimer();
          setMessages([{ id: Date.now().toString(), sender: 'system', text: "Connected! Say hi 👋" }]);
        }, 1500); // Give PeerJS a moment to handshake
      } else {
        console.log(`[Match] No partner found yet, polling...`);
        if (!matchPollRef.current) {
          matchPollRef.current = setInterval(() => findMatch(id, mode, _stream), 3000);
        }
      }
    } catch (err: any) {
      console.error("[Match] API Error:", err);
      setStatus(`Network Error: ${err.message || "Unknown error"}`);
    }
  };

  const setupCallListeners = (call: MediaConnection) => {
    callRef.current = call;
    call.on("stream", (remoteStream) => {
      console.log(`[Peer] Received remote stream`);
      setRemoteStream(remoteStream);
      setStatus("Connected!");
    });
    call.on("close", () => {
      handlePeerDisconnected();
    });
  };

  const setupDataListeners = (conn: DataConnection) => {
    dataConnRef.current = conn;
    conn.on("data", (data: any) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'stranger', text: data.toString() }]);
    });
    conn.on("close", () => {
      handlePeerDisconnected();
    });
  };

  const handlePeerDisconnected = () => {
    setStatus("Finding your match...");
    setMessages([]);
    setRemoteStream(null);
    startSearchTimer();
    
    // Auto-restart search
    if (peerRef.current?.id) {
       findMatch(peerRef.current.id, isTextOnly ? "text" : "video", stream);
    }
  };

  const handleNext = () => {
    console.log("[Peer] Next pressed");
    callRef.current?.close();
    dataConnRef.current?.close();
    setMessages([]);
    setStatus("Finding your match...");
    startSearchTimer();
    
    if (peerRef.current?.id) {
       findMatch(peerRef.current.id, isTextOnly ? "text" : "video", stream);
    }
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !dataConnRef.current) return;
    
    const newMsg: Message = { id: Date.now().toString(), sender: 'me', text: inputText };
    setMessages(prev => [...prev, newMsg]);
    dataConnRef.current.send(inputText);
    setInputText("");
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  const renderHeader = () => (
    <header className="w-full h-14 bg-[#0a0a0a] border-b border-zinc-800 flex flex-none items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-zinc-400 hover:text-white transition group">
          <X className="w-5 h-5 group-hover:scale-110 transition" />
          <span className="font-medium text-sm">End</span>
        </button>
        <div className="flex items-center gap-2 bg-[#121214] px-3 py-1.5 rounded-full border border-zinc-800">
           {status === "Finding your match..." || status === "Initializing..." ? (
             <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-pulse"></span>
           ) : (
             <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
           )}
           <span className="text-sm font-medium text-zinc-200">
             {status === "Finding your match..." ? "Searching global pool..." : 
              status === "Connected!" ? "Stranger matched" : 
              status}
           </span>
        </div>
      </div>
      <div className="text-zinc-400 font-mono text-sm tracking-wider">
        {status === "Connected!" ? formatTimer(chatTimer) : formatTimer(searchTimer)}
      </div>
    </header>
  );

  const renderMessages = () => (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.sender === 'system' ? 'mx-auto items-center' : msg.sender === 'me' ? 'self-end items-end' : 'self-start items-start'}`}>
          {msg.sender === 'system' && (
            <span className="text-xs text-zinc-500 font-medium my-2">{msg.text}</span>
          )}
          {msg.sender === 'stranger' && (
            <div className="bg-[#1a1a1d] border border-zinc-800 text-white px-4 py-2.5 rounded-2xl rounded-tl-sm text-[15px] shadow-sm">
              {msg.text}
            </div>
          )}
          {msg.sender === 'me' && (
            <div className="bg-cyan-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-[15px] shadow-sm">
              {msg.text}
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );

  const renderInput = () => (
    <div className="p-3 bg-[#0a0a0a] border-t border-zinc-800 flex-none flex flex-col gap-3">
      <form onSubmit={sendMessage} className="flex gap-2 w-full">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..." 
          disabled={status !== "Connected!"}
          className="flex-1 bg-[#121214] border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <button type="submit" disabled={!inputText.trim() || status !== "Connected!"} className="w-12 h-12 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-500 rounded-xl flex items-center justify-center transition disabled:opacity-50">
          <Send className="w-5 h-5" />
        </button>
      </form>
      <div className="flex gap-2">
         <button onClick={handleNext} className="flex-1 bg-[#ef4444] hover:bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm">
           <SkipForward className="w-5 h-5 fill-white" /> Next
         </button>
         {!isTextOnly && status === "Connected!" && (
            <>
              <button onClick={toggleMic} className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${isMicMuted ? 'bg-[#1a1a1d] text-zinc-500' : 'bg-zinc-800 text-white'}`}>
                {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button onClick={toggleCam} className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${isCamOff ? 'bg-[#1a1a1d] text-zinc-500' : 'bg-zinc-800 text-white'}`}>
                {isCamOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              </button>
            </>
         )}
         <button className="w-12 h-12 bg-[#121214] border border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-xl flex items-center justify-center transition">
           <Flag className="w-5 h-5" />
         </button>
      </div>
    </div>
  );

  if (permissionState === 'prompt') {
    return (
      <div className="flex-1 flex items-center justify-center w-full min-h-screen bg-[#050505]">
        <div className="max-w-md w-full bg-[#121214] border border-zinc-800 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-cyan-950/30 flex items-center justify-center border border-cyan-800/30 mb-6 z-10">
            <Camera className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3 z-10 text-white">Allow Camera & Microphone</h2>
          <p className="text-sm text-zinc-400 mb-8 z-10 leading-relaxed">
            RandomChat needs your camera and mic for video chat. Your stream is sent peer-to-peer and <strong className="text-white font-medium">never stored</strong>.
          </p>
          <button onClick={requestPermissions} className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all z-10 flex items-center justify-center gap-2 mb-4">
            <Camera className="w-5 h-5 fill-black/50" /> Allow Camera & Microphone
          </button>
          <button onClick={handleTextOnlyMode} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors z-10">
            Continue with text chat only &rarr;
          </button>
        </div>
      </div>
    );
  }

  if (status === "Finding your match..." || status === "Initializing...") {
    return (
      <div className="flex flex-col w-full h-screen bg-[#050505]">
        {renderHeader()}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-16">
          <div className="flex-1 flex flex-col items-center max-w-lg w-full">
            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
              <div className="absolute inset-4 rounded-full border border-cyan-500/10 animate-[ping_2.5s_linear_infinite]"></div>
              <div className="absolute inset-10 rounded-full border border-cyan-500/20 animate-[ping_2.5s_linear_infinite_500ms]"></div>
              <div className="absolute inset-16 rounded-full border border-cyan-500/30 animate-[ping_2.5s_linear_infinite_1000ms]"></div>
              <div className="w-16 h-16 bg-[#121214] border border-zinc-800 rounded-full flex items-center justify-center z-10 relative">
                <Search className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold mb-2 text-white tracking-tight">Finding your match...</h2>
            <p className="text-sm text-zinc-500 mb-10">Searching global pool</p>

            <div className="w-full bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6">
               <p className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase mb-4">Filter by Interests (Optional)</p>
               <div className="flex flex-wrap gap-2">
                 {interests.map((interest) => (
                   <button key={interest} className="px-3 py-1.5 bg-[#121214] hover:bg-zinc-800 border border-zinc-800 rounded-full text-xs text-zinc-400 hover:text-white transition-colors">
                     {interest}
                   </button>
                 ))}
               </div>
            </div>
          </div>
          
          <div className="hidden md:flex w-full md:w-[320px] aspect-video border-2 border-dashed border-zinc-800 bg-[#0a0a0a] rounded-2xl flex-col items-center justify-center text-xs text-zinc-600">
             <span className="font-semibold tracking-widest uppercase mb-1">Advertisement</span>
             <span>medium rectangle</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-screen bg-[#050505] overflow-hidden">
      {renderHeader()}
      
      <div className="flex-1 flex flex-col md:flex-row w-full h-[calc(100vh-56px)] overflow-hidden bg-[#050505]">
        
        {!isTextOnly && (
          <div className="flex-[2] flex flex-col relative bg-black border-r border-zinc-900">
            <div className="absolute inset-0 flex items-center justify-center">
               {!remoteStream && (
                 <div className="w-20 h-20 rounded-full bg-[#121214] border border-zinc-800 flex items-center justify-center">
                   <Video className="w-8 h-8 text-zinc-600" />
                 </div>
               )}
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>

            <div className="absolute top-4 right-4 w-1/4 max-w-[200px] aspect-video bg-[#121214] rounded-xl overflow-hidden shadow-2xl border border-zinc-800 z-20">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
              <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur px-2 py-0.5 rounded text-[10px] text-zinc-300 font-medium tracking-wide">You</div>
            </div>
            
            <div className="absolute bottom-4 left-4 bg-[#121214] border border-zinc-800 px-4 py-1.5 rounded-full text-sm font-medium text-white shadow-lg">Stranger</div>
          </div>
        )}

        <div className={`flex flex-col bg-[#050505] relative ${isTextOnly ? 'flex-1 pt-44 max-w-3xl mx-auto w-full border-x border-zinc-900' : 'flex-1 w-full max-w-[400px]'}`}>
          {!isTextOnly && (
             <div className="p-4 flex-none border-b border-zinc-900 bg-[#0a0a0a]">
                <div className="w-full aspect-video border border-zinc-800 bg-[#121214] rounded-xl flex flex-col items-center justify-center text-xs text-zinc-600">
                  <span className="font-semibold tracking-widest uppercase mb-1">Advertisement</span>
                  <span>medium rectangle</span>
                </div>
             </div>
          )}

          {renderMessages()}
          {renderInput()}
        </div>
      </div>
    </div>
  );
}
