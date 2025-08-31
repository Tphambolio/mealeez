import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface VoiceAssistantProps {
  className?: string;
  onResult?: (result: string) => void;
  context?: 'planning' | 'cooking';
  recipeContext?: any;
  currentStep?: any;
}

export function VoiceAssistant({ 
  className, 
  onResult, 
  context = 'planning',
  recipeContext,
  currentStep 
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);
        
        if (event.results[current].isFinal) {
          handleVoiceCommand(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Please try again.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    try {
      onResult?.(command);
      
      if (context === 'planning') {
        const response = await apiRequest('POST', '/api/voice/plan-meal', {
          transcript: command,
          preferences: {}
        });
        const result = await response.json();
        
        if (result.response) {
          speak(result.response);
        }
      } else if (context === 'cooking') {
        const response = await apiRequest('POST', '/api/voice/cooking-assistance', {
          question: command,
          recipeContext,
          currentStep
        });
        const result = await response.json();
        
        if (result.response) {
          speak(result.response);
        }
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      toast({
        title: "Voice Command Error",
        description: "Failed to process voice command.",
        variant: "destructive",
      });
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className={cn(
              "rounded-full w-12 h-12",
              isListening && "animate-pulse"
            )}
            onClick={isListening ? stopListening : startListening}
            data-testid="button-voice-toggle"
          >
            {isListening ? <MicOff /> : <Mic />}
          </Button>
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isListening ? "Listening..." : "Tap to speak"}
            </p>
            {transcript && (
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-transcript">
                {transcript}
              </p>
            )}
          </div>
          
          {isSpeaking && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopSpeaking}
              data-testid="button-stop-speaking"
            >
              <VolumeX className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {context === 'cooking' && (
          <div className="mt-3 text-xs text-muted-foreground">
            <p>Try saying: "What's next?", "Repeat that", "Set timer for 5 minutes"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
