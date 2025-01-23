"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface RealtimeEvent {
  type: string;
  response?: {
    modalities: string[];
    instructions: string;
    content?: string;
  };
  event_id?: string;
  response_id?: string;
  delta?: string;
  audio_data?: Uint8Array;
  transcript?: string;
  input_audio_transcription?: string;
  text?: string;
  output?: Array<{
    content: Array<{
      type: string;
      transcript?: string;
    }>;
  }>;
  [key: string]: unknown;
}

interface Message {
  type: 'sent' | 'received';
  content: string;
  timestamp: Date;
  audio?: HTMLAudioElement;
}

export default function RealtimeChat() {
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string>('');

  const initializeConnection = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const tokenResponse = await fetch("/api/realtime-session");
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.client_secret.value;

      const pc = new RTCPeerConnection();
      setPeerConnection(pc);

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0]);
      setIsMicActive(true);

      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      const answer: RTCSessionDescriptionInit = {
        type: 'answer' as const,
        sdp: await sdpResponse.text(),
      };
      
      await pc.setRemoteDescription(answer);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to initialize connection:', error);
      setError('Failed to establish connection. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const sendMessage = (message: RealtimeEvent) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(message));
      setMessages(prev => [...prev, {
        type: 'sent',
        content: message.response?.instructions || JSON.stringify(message),
        timestamp: new Date()
      }]);
    }
  };

  const processEvent = (event: RealtimeEvent) => {
    console.log('Processing event:', event.type, event);
    
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        setCurrentMessage('');
        break;

      case 'input_audio_buffer.speech_stopped':
        // Don't add message here, wait for transcription
        setCurrentMessage('');
        break;

      case 'input_audio_transcription.created':
      case 'input_audio_transcription.updated':
        // Show interim transcription as current message
        if (event.text || event.input_audio_transcription) {
          const transcription = event.text || event.input_audio_transcription;
          if (transcription) {
            setCurrentMessage(transcription);
          }
        }
        break;

      case 'input_audio_transcription.done':
        // Add final transcription as sent message
        if (event.text || event.input_audio_transcription) {
          const transcription = event.text || event.input_audio_transcription;
          if (transcription) {
            setMessages(prev => [...prev, {
              type: 'sent',
              content: transcription,
              timestamp: new Date()
            }]);
            setCurrentMessage('');
          }
        }
        break;

      case 'response.audio_transcript.delta':
        // Show AI's response as it comes in
        if (event.delta) {
          setCurrentMessage(prev => prev + event.delta);
        }
        break;

      case 'response.audio_transcript.done':
        // Add AI's complete response
        if (event.transcript) {
          setMessages(prev => [...prev, {
            type: 'received',
            content: event.transcript || '',
            timestamp: new Date()
          }]);
          setCurrentMessage('');
        }
        break;

      case 'response.done':
        const transcript = event.output?.[0]?.content?.[0]?.transcript;
        if (transcript) {
          setMessages(prev => [...prev, {
            type: 'received',
            content: transcript,
            timestamp: new Date()
          }]);
        }
        break;
        
      case 'response.audio.added':
        if (event.audio_data) {
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = audioContext.createBuffer(1, event.audio_data.length, 24000);
            audioBuffer.getChannelData(0).set(new Float32Array(event.audio_data.buffer));
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
          } catch (error) {
            console.error('Audio playback error:', error);
          }
        }
        break;
        
      case 'response.audio.done':
      case 'response.content_part.done':
      case 'response.output_item.done':
        // These events don't need handling
        break;
        
      case 'input_audio_buffer.transcription':
        if (event.text) {
          setCurrentMessage(event.text);
          setMessages(prev => [...prev, {
            type: 'sent',
            content: event.text as string,
            timestamp: new Date()
          }]);
        }
        break;
        
      default:
        console.log('Unhandled event type:', event.type);
    }
  };

  const handleStopChat = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setDataChannel(null);
      setIsConnected(false);
      setIsMicActive(false);
    }
  };

  useEffect(() => {
    if (!dataChannel) return;

    const handleMessage = (e: MessageEvent) => {
      try {
        const event: RealtimeEvent = JSON.parse(e.data);
        processEvent(event);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
  }, [dataChannel]);

  useEffect(() => {
    return () => {
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, [peerConnection]);

  const MessageDisplay = ({ message }: { message: Message }) => {
    return (
      <div className={`flex flex-col p-4 my-3 rounded-xl shadow-sm max-w-[85%] ${
        message.type === 'sent' 
          ? 'ml-auto bg-blue-50 border border-blue-100 relative' 
          : 'mr-auto bg-green-50 border border-green-100 relative'
      }`}>
        <div className={`text-xs font-semibold mb-1 ${
          message.type === 'sent' ? 'text-blue-700' : 'text-green-700'
        }`}>
          {message.type === 'sent' ? 'You' : 'AI Assistant'}
        </div>
        <div className="message-content">{message.content}</div>
        <div className="text-xs text-gray-500 mt-1">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-[600px] bg-white rounded-xl shadow-lg flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold m-0">AI Interview Practice</h2>
          {isMicActive && (
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Microphone active" />
          )}
        </div>
        <div className="flex items-center">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-green-600">Connected</span>
              <Button 
                variant="destructive"
                size="sm"
                onClick={handleStopChat}
              >
                Stop
              </Button>
            </div>
          ) : (
            <Button 
              onClick={initializeConnection}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Start Practice'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-600 p-3 mx-4 my-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 && !isConnected && (
          <div className="text-center text-gray-500 mt-8">
            Click Start Practice to begin your interview practice session
          </div>
        )}
        {messages.map((msg, index) => (
          <MessageDisplay key={index} message={msg} />
        ))}
        {currentMessage && (
          <div className={`flex flex-col p-4 my-3 rounded-xl shadow-sm max-w-[85%] ${
            currentMessage.startsWith('You:') 
              ? 'ml-auto bg-blue-50 border border-blue-100' 
              : 'mr-auto bg-green-50 border border-green-100'
          }`}>
            <div className={`text-xs font-semibold mb-1 ${
              currentMessage.startsWith('You:') ? 'text-blue-700' : 'text-green-700'
            }`}>
              {currentMessage.startsWith('You:') ? 'You' : 'AI Assistant'}
            </div>
            <div className="relative">
              {currentMessage}
              <span className="animate-pulse ml-1">▋</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <Button
          className="w-full"
          variant="default"
          size="lg"
          onClick={() => {
            sendMessage({
              type: "response.create",
              response: {
                modalities: ["text"],
                instructions: "Tell me about your business idea"
              }
            });
          }}
          disabled={!isConnected}
        >
          Ask About Business Idea
        </Button>
      </div>
    </div>
  );
}