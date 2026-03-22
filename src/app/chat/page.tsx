"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import io, { Socket } from "socket.io-client";
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
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentRoomRef = useRef<string | null>(null);
  
  const searchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse URL params for Text Only mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("mode") === "text") {
        handleTextOnlyMode();
      }
    }
    
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      socketRef.current?.disconnect();
      peerConnectionRef.current?.close();
      stopTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync streams to video elements when they become available in the DOM
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

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stopTimers = () => {
    if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
    if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
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
    initSocket(null, "text");
  };

  const requestPermissions = async () => {
    try {
      const _stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(_stream);
      setPermissionState('granted');
      if (localVideoRef.current) localVideoRef.current.srcObject = _stream;
      setStatus("Finding your match...");
      startSearchTimer();
      initSocket(_stream, "video");
    } catch (err: any) {
      console.error("Error accessing media devices", err);
      if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        alert("⚠️ Camera/Mic is already in use by another application. Please close other apps and refresh.");
      }
      setPermissionState('denied');
      handleTextOnlyMode(); // Fallback to text
    }
  };

  const initSocket = (_stream: MediaStream | null, mode: "video" | "text") => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    console.log(`[Chat] Connecting to Socket Server: ${socketUrl}`);
    
    const socket = io(socketUrl, {
      reconnectionAttempts: 5,
      timeout: 10000
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`[Chat] Connected to server! ID: ${socket.id}`);
      socket.emit("find_match", { mode });
    });

    socket.on("connect_error", (err) => {
      console.error(`[Chat] Connection Error:`, err.message);
      setStatus("Connection Error. Check internet/server.");
    });

    socket.on("waiting_for_match", () => {
      setStatus("Finding your match...");
      setMessages([]);
    });

    socket.on("match_found", () => {
      setStatus("Match Found!");
    });

    socket.on("match_info", async (data) => {
      setStatus("Connected!");
      startChatTimer();
      currentRoomRef.current = data.roomId;
      setMessages([{ id: Date.now().toString(), sender: 'system', text: "Connected! Say hi 👋" }]);

      if (mode === "video" && _stream) {
        initPeerConnection(_stream, data.isInitiator, data.roomId);
      }
    });

    socket.on("message", (text) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'stranger', text }]);
    });

    socket.on("offer", async (offer) => {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket.emit("answer", { answer, roomId: currentRoomRef.current });
    });

    socket.on("answer", async (answer) => {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice_candidate", async (candidate) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding received ice candidate", e);
      }
    });

    socket.on("peer_disconnected", () => {
      setStatus("Finding your match...");
      setMessages([]);
      startSearchTimer();
      cleanupPeerConnection();
      
      setTimeout(() => {
        socketRef.current?.emit("find_match", { mode });
      }, 500);
    });
  };

  const initPeerConnection = async (_stream: MediaStream, isInitiator: boolean, roomId: string) => {
    const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    _stream.getTracks().forEach((track) => pc.addTrack(track, _stream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice_candidate", { candidate: event.candidate, roomId });
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("offer", { offer, roomId });
    }
  };

  const cleanupPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    currentRoomRef.current = null;
  };

  const handleNext = () => {
    if (!socketRef.current) return;
    setStatus("Finding your match...");
    setMessages([]);
    startSearchTimer();
    cleanupPeerConnection();
    socketRef.current.emit("next", { roomId: currentRoomRef.current });
    setTimeout(() => { socketRef.current?.emit("find_match", { mode: isTextOnly ? "text" : "video" }); }, 300);
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || status !== "Connected!") return;
    
    const newMsg: Message = { id: Date.now().toString(), sender: 'me', text: inputText };
    setMessages(prev => [...prev, newMsg]);
    socketRef.current?.emit("message", { roomId: currentRoomRef.current, message: newMsg.text });
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
             {status === "Finding your match..." ? `Searching global pool...` : 
              status === "Match Found!" ? "Connecting..." : 
              status.startsWith("Connection Error") ? "⚠️ Server unreachable. Check Netlify Env Vars." :
              "Stranger from United States us"}
           </span>
        </div>
        {isTextOnly && (
           <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
             Text Only
           </span>
        )}
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

  // --- 1. PERMISSION prompt
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

  // --- 2. MATCH FOUND or LOADING
  if (status === "Finding your match..." || status === "Match Found!") {
    return (
      <div className="flex flex-col w-full h-screen bg-[#050505]">
        {renderHeader()}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-16">
          <div className="flex-1 flex flex-col items-center max-w-lg w-full">
            {status === "Match Found!" ? (
              <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)] relative z-10 border-4 border-green-400/50">
                   <div className="w-8 h-8 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
                </div>
              </div>
            ) : (
              <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                <div className="absolute inset-4 rounded-full border border-cyan-500/10 animate-[ping_2.5s_linear_infinite]"></div>
                <div className="absolute inset-10 rounded-full border border-cyan-500/20 animate-[ping_2.5s_linear_infinite_500ms]"></div>
                <div className="absolute inset-16 rounded-full border border-cyan-500/30 animate-[ping_2.5s_linear_infinite_1000ms]"></div>
                <div className="w-16 h-16 bg-[#121214] border border-zinc-800 rounded-full flex items-center justify-center z-10 relative">
                  <Search className="w-6 h-6 text-cyan-400 animate-pulse" />
                </div>
              </div>
            )}
            
            <h2 className="text-3xl font-bold mb-2 text-white tracking-tight">{status === "Match Found!" ? "Match Found!" : "Finding your match..."}</h2>
            <p className="text-sm text-zinc-500 mb-10">{status === "Match Found!" ? "Connecting peer-to-peer..." : "Searching global pool"}</p>

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

  // --- 3. ACTIVE CHAT
  return (
    <div className="flex flex-col w-full h-screen bg-[#050505] overflow-hidden">
      {renderHeader()}
      
      <div className="flex-1 flex flex-col md:flex-row w-full h-[calc(100vh-56px)] overflow-hidden bg-[#050505]">
        
        {/* Main Video Area (Hidden if Text Only) */}
        {!isTextOnly && (
          <div className="flex-[2] flex flex-col relative bg-black border-r border-zinc-900">
            {/* Remote Video */}
            <div className="absolute inset-0 flex items-center justify-center">
               {!remoteStream && (
                 <div className="w-20 h-20 rounded-full bg-[#121214] border border-zinc-800 flex items-center justify-center">
                   <Video className="w-8 h-8 text-zinc-600" />
                 </div>
               )}
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>

            {/* PIP Local Video */}
            <div className="absolute top-4 right-4 w-1/4 max-w-[200px] aspect-video bg-[#121214] rounded-xl overflow-hidden shadow-2xl border border-zinc-800 z-20">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
              <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur px-2 py-0.5 rounded text-[10px] text-zinc-300 font-medium tracking-wide">You</div>
            </div>
            
            <div className="absolute bottom-4 left-4 bg-[#121214] border border-zinc-800 px-4 py-1.5 rounded-full text-sm font-medium text-white shadow-lg">Stranger</div>
          </div>
        )}

        {/* Text Mode Active Ads Area (Top Center if full screen) */}
        {isTextOnly && (
          <div className="absolute top-0 left-0 right-0 p-4 shrink-0 flex flex-col items-center justify-center z-10 pointer-events-none">
             <div className="w-full max-w-sm h-28 border border-zinc-800 bg-[#0a0a0a] rounded-2xl flex flex-col items-center justify-center text-xs text-zinc-600 pointer-events-auto shadow-xl">
               <span className="font-semibold tracking-widest uppercase mb-1">Advertisement</span>
               <span>medium rectangle</span>
             </div>
             {permissionState === 'denied' && (
               <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-yellow-500/80 bg-yellow-500/10 px-4 py-1.5 rounded-full border border-yellow-500/20 pointer-events-auto">
                 <TriangleAlert className="w-4 h-4" /> Text only — camera/mic access denied
               </div>
             )}
          </div>
        )}

        {/* Sidebar / Chat Log */}
        <div className={`flex flex-col bg-[#050505] relative ${isTextOnly ? 'flex-1 pt-44 max-w-3xl mx-auto w-full border-x border-zinc-900' : 'flex-1 w-full max-w-[400px]'}`}>
          
          {/* Top Ad in Video Mode Sidebar */}
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
