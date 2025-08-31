import { useState, useRef, useEffect, useCallback } from "react";
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
  userName?: string;
  autoStart?: boolean;
  onMealPlanCreated?: (mealPlans: any[]) => void;
  onRecipeCreated?: (recipe: any) => void;
}

export function VoiceAssistant({ 
  className, 
  onResult, 
  context = 'planning',
  recipeContext,
  currentStep,
  userName,
  autoStart = false,
  onMealPlanCreated,
  onRecipeCreated
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversationStep, setConversationStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Process all results to build complete transcript
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Show interim results for user feedback
        if (interimTranscript) {
          setTranscript(interimTranscript);
          onResult?.(interimTranscript);
          console.log('Voice result (interim):', interimTranscript);
        }
        
        // Only process final results and ensure minimum length
        if (finalTranscript.trim().length > 3) {
          console.log('Processing final transcript:', finalTranscript.trim());
          handleVoiceCommand(finalTranscript.trim());
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

    // Auto-start welcome message if requested
    if (autoStart && !hasStarted && userName) {
      console.log('Auto-starting conversation for:', userName);
      const timer = setTimeout(() => {
        if (!hasStarted) {
          console.log('Triggering welcome conversation');
          startConversation();
        }
      }, 2000);
      
      return () => {
        clearTimeout(timer);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [autoStart, hasStarted, userName]);

  // Define speak function first
  const speak = useCallback((text: string) => {
    console.log('Speaking:', text);
    
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported - will show text instead');
      // Show the text response visually if speech isn't available
      setTranscript(`AI: ${text}`);
      return;
    }
    
    try {
      // Cancel any existing speech
      speechSynthesis.cancel();
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      utterance.onstart = () => {
        console.log('Speech synthesis started successfully');
      };
      
      utterance.onend = () => {
        console.log('Speech synthesis ended');
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
        // Fallback to showing text
        setTranscript(`AI: ${text}`);
      };
      
      // Try to speak immediately
      speechSynthesis.speak(utterance);
      
      // Fallback timeout
      setTimeout(() => {
        if (speechSynthesis.speaking) {
          console.log('Speech still active');
        } else if (isSpeaking) {
          console.log('Speech completed or failed, resetting state');
          setIsSpeaking(false);
        }
      }, Math.max(text.length * 80 + 2000, 5000));
      
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      setIsSpeaking(false);
      // Fallback to showing text
      setTranscript(`AI: ${text}`);
    }
  }, [isSpeaking]);

  const startConversation = () => {
    console.log('Starting conversation, hasStarted:', hasStarted);
    if (hasStarted) return;
    
    setHasStarted(true);
    setConversationStep(1);
    
    const welcomeMessage = `Hi ${userName || 'there'}! Welcome to MealBuilder. I'm here to help you plan your weekly meals. Let's get started! Tell me about your dietary preferences, any allergies, and how many people you're cooking for this week.`;
    
    console.log('Welcome message:', welcomeMessage);
    speak(welcomeMessage);
    
    // Auto-start listening after welcome
    setTimeout(() => {
      console.log('Auto-starting listening after welcome');
      startListening();
    }, 10000);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleVoiceCommand = useCallback(async (command: string) => {
    // Prevent duplicate processing
    if (isProcessing) {
      console.log('Already processing, skipping:', command);
      return;
    }
    
    try {
      console.log('Processing voice command:', command, 'Step:', conversationStep);
      setIsProcessing(true);
      onResult?.(command);
      
      if (context === 'planning') {
        console.log('Sending to backend:', { transcript: command, conversationStep, preferences: {} });
        
        const response = await apiRequest('POST', '/api/voice/plan-meal', {
          transcript: command,
          conversationStep: conversationStep,
          preferences: {}
        });
        
        const result = await response.json();
        console.log('Backend response:', result);
        
        if (result.response) {
          console.log('Speaking response:', result.response);
          speak(result.response);
          
          // Process meal planning results
          if (result.mealPlans && result.mealPlans.length > 0 && onMealPlanCreated) {
            console.log('Creating meal plans:', result.mealPlans);
            result.mealPlans.forEach((plan: any) => onMealPlanCreated(plan));
          }
          
          if (result.recipes && result.recipes.length > 0 && onRecipeCreated) {
            console.log('Creating recipes:', result.recipes);
            result.recipes.forEach((recipe: any) => onRecipeCreated(recipe));
          }
          
          // Guide conversation flow
          if (result.nextStep) {
            console.log('Moving to next step:', result.nextStep);
            setConversationStep(result.nextStep);
            
            // Calculate speech duration and add buffer time
            const speechDuration = result.response.length * 100; // Rough estimate
            const delayTime = Math.max(speechDuration, 4000);
            
            setTimeout(() => {
              console.log('Auto-continuing conversation');
              startListening();
            }, delayTime);
          }
        } else {
          console.warn('No response from backend');
          speak('Sorry, I didn\'t understand that. Could you try again?');
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
      speak('Sorry, I encountered an error. Please try again.');
      toast({
        title: "Voice Command Error",
        description: "Failed to process voice command.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, conversationStep, context, onResult, onMealPlanCreated, onRecipeCreated, recipeContext, currentStep, toast, startListening, speak]);

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
            variant={isListening ? "destructive" : isProcessing ? "secondary" : "default"}
            size="lg"
            className={cn(
              "rounded-full w-12 h-12",
              isListening && "animate-pulse",
              isProcessing && "animate-bounce"
            )}
            onClick={isListening ? stopListening : (hasStarted ? startListening : startConversation)}
            disabled={isProcessing}
            data-testid="button-voice-toggle"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : isListening ? (
              <MicOff />
            ) : (
              <Mic />
            )}
          </Button>
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isProcessing ? "AI is thinking..." : isListening ? "Listening..." : hasStarted ? "Tap to speak" : "Start planning"}
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
        
        {context === 'planning' && conversationStep > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            <p>
              {conversationStep === 1 && "Tell me about dietary preferences and serving size..."}
              {conversationStep === 2 && "What meals would you like this week?"}
              {conversationStep === 3 && "Any specific recipes or cuisines in mind?"}
              {conversationStep > 3 && "I'm here to help with your meal planning!"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
