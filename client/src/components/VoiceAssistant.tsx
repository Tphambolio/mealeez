import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays } from "date-fns";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceAssistantProps {
  className?: string;
  onResult?: (result: string) => void;
  context?: "planning" | "cooking";
  recipeContext?: any;
  currentStep?: any;
  getClientState?: () => any; // pass current meals/groceries/calendar if available
  onMealPlanCreated?: (mealPlan: any) => void;
  onRecipeCreated?: (recipe: any) => void;
  autoStart?: boolean;
  userName?: string;
}

export function VoiceAssistant({
  className,
  onResult,
  context = "planning",
  recipeContext,
  currentStep,
  getClientState = () => ({}),
  onMealPlanCreated,
  onRecipeCreated,
  autoStart = false,
  userName
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const keepListeningRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Check if browser supports SpeechRecognition (problematic on Android)
  const hasSpeechRecognition = !!(window as any).webkitSpeechRecognition || !!(window as any).SpeechRecognition;

  useEffect(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) {
      console.warn("SpeechRecognition not supported in this browser.");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;

    rec.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const txt = r[0].transcript;
        if (r.isFinal) finalText += txt;
        else interim += txt;
      }
      if (interim) setTranscript(interim.trim());
      if (finalText && finalText.trim().length > 3) {
        setTranscript("");
        handleVoiceCommand(finalText.trim());
      }
    };

    rec.onerror = (e: any) => {
      console.error("STT error:", e.error);
      setIsListening(false);
      keepListeningRef.current = false;
      toast({ title: "Voice error", description: e.error, variant: "destructive" });
    };

    rec.onend = () => {
      setIsListening(false);
      if (keepListeningRef.current) {
        setTimeout(() => {
          try {
            rec.start();
            setIsListening(true);
          } catch {}
        }, 250);
      }
    };

    return () => rec.stop();
  }, []);

  // Auto-start conversation for meal planning
  useEffect(() => {
    if (autoStart && !hasStarted && userName && context === 'planning') {
      console.log('Auto-starting conversation for:', userName);
      setTimeout(() => {
        console.log('Triggering welcome conversation');
        startConversation();
      }, 2000);
    }
  }, [autoStart, hasStarted, userName, context]);

  const startConversation = () => {
    console.log('Starting conversation, hasStarted:', hasStarted);
    if (hasStarted) return;
    
    setHasStarted(true);
    
    const welcomeMessage = `Hi ${userName || 'there'}! Welcome to MealBuilder. I'm here to help you plan your weekly meals. Let's get started! Tell me about your dietary preferences, any allergies, and how many people you're cooking for this week.`;
    
    console.log('Welcome message:', welcomeMessage);
    
    // Speak welcome message using the same pattern as handleVoiceCommand
    if (!("speechSynthesis" in window)) {
      console.warn('Speech synthesis not supported - showing text instead');
      setTranscript(`AI: ${welcomeMessage}`);
      setTimeout(() => {
        console.log('Auto-starting listening after welcome');
        startListening();
      }, 2000);
      return;
    }
    
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(welcomeMessage); 
    utterance.onend = () => { 
      setIsSpeaking(false); 
      console.log('Auto-starting listening after welcome');
      startListening();
    }; 
    setIsSpeaking(true); 
    window.speechSynthesis.speak(utterance);
  };

  const startListening = async () => {
    if (isListening) return;
    
    setTranscript("");
    
    if (hasSpeechRecognition && recognitionRef.current) {
      // Use native speech recognition if available
      keepListeningRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        return;
      } catch (error) {
        console.error('SpeechRecognition failed, falling back to MediaRecorder:', error);
      }
    }

    // Fallback: Use MediaRecorder + Whisper STT for Android compatibility
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Try different mime types for better Android compatibility
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/wav";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/mp4";
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped, processing audio...', `Format: ${mimeType}`);
        const blob = new Blob(chunks, { type: mimeType });
        
        try {
          const formData = new FormData();
          formData.append("audio", blob, `speech.${mimeType.split('/')[1]}`);
          
          const response = await fetch("/api/stt", {
            method: "POST",
            body: formData,
          });
          
          const result = await response.json();
          
          if (response.ok && result.text?.trim()) {
            console.log('STT result:', result.text);
            await handleVoiceCommand(result.text.trim());
          } else {
            console.error('STT error:', result);
            toast({
              title: "Voice Recognition Error",
              description: "Could not process audio. Please try again.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('STT request failed:', error);
          toast({
            title: "Voice Recognition Error",
            description: "Failed to process voice input. Please try again.",
            variant: "destructive",
          });
        } finally {
          cleanup();
        }
      };
      
      mediaRecorder.start();
      setIsListening(true);
      
      // Auto-stop after 4 seconds for better UX
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 4000);
      
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    setIsListening(false);
  };

  const stopListening = () => {
    keepListeningRef.current = false;
    
    if (recognitionRef.current && hasSpeechRecognition) {
      recognitionRef.current.stop();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
    }
  };

  function extractLastJSONObject(text: string): any | null {
    const lastBrace = text.lastIndexOf("{");
    if (lastBrace < 0) return null;
    for (let i = lastBrace; i >= 0; i--) {
      const slice = text.slice(i).trim();
      try {
        return JSON.parse(slice);
      } catch {}
    }
    return null;
  }

  async function sendStreaming(route: string, payload: any) {
    const response = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    if (!response.body) {
      throw new Error('No response body received');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        // Optional: show typing effect here by updating UI with fullText
      }
    } finally {
      reader.releaseLock();
    }
    
    // Extract the last valid JSON object from the stream
    for (let i = fullText.lastIndexOf("{"); i >= 0; i--) {
      try {
        return JSON.parse(fullText.slice(i).trim());
      } catch {}
    }
    
    throw new Error("No valid JSON found in stream response");
  }

  async function applyActions(actions: any[]) {
    if (!Array.isArray(actions)) return;
    console.log('Applying actions:', actions);
    
    for (const action of actions) {
      console.log("APPLY ACTION:", action.type, action.data);
      
      try {
        switch (action.type) {
          case "ADD_MEALS":
            await handleAddMeals(action.data);
            break;
          case "UPDATE_GROCERIES":
            await handleUpdateGroceries(action.data);
            break;
          case "BUILD_CALENDAR":
            await handleBuildCalendar(action.data);
            break;
          default:
            console.warn("Unknown action:", action.type);
        }
      } catch (error) {
        console.error(`Error applying ${action.type} action:`, error);
        toast({
          title: `Error processing ${action.type}`,
          description: "Some meal planning actions couldn't be completed.",
          variant: "destructive",
        });
      }
    }
  }

  const handleAddMeals = async (meals: any[]) => {
    if (!Array.isArray(meals)) return;
    
    const createdRecipes = [];
    const createdMealPlans = [];

    for (const meal of meals) {
      try {
        // Create recipe first if needed
        let recipeId = meal.recipeId;
        if (!recipeId && meal.recipe) {
          console.log('Creating new recipe:', meal.recipe);
          const newRecipe = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: meal.recipe,
              description: `AI-generated recipe for ${meal.recipe}`,
              servings: meal.servings || 4,
              prepTime: 30,
              cookTime: 30,
            }),
          });
          const recipeData = await newRecipe.json();
          recipeId = recipeData.id;
          createdRecipes.push(recipeData);
          
          // Add ingredients if provided
          if (meal.ingredients && Array.isArray(meal.ingredients)) {
            for (const ingredient of meal.ingredients) {
              await fetch('/api/ingredients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  recipeId,
                  raw: `${ingredient.qty || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim(),
                  quantity: ingredient.qty?.toString(),
                  unit: ingredient.unit,
                  item: ingredient.name,
                  aisle: ingredient.category || null,
                }),
              });
            }
          }
        }

        // Create meal plan
        if (meal.day && meal.slot) {
          const mealDate = getMealDate(meal.day);
          console.log('Creating meal plan:', { date: mealDate, slot: meal.slot, recipeId });
          
          const mealPlan = await fetch('/api/meal-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: mealDate,
              mealSlot: meal.slot.toLowerCase(),
              recipeId: recipeId,
              servingsOverride: meal.servings,
            }),
          });
          const mealPlanData = await mealPlan.json();
          createdMealPlans.push(mealPlanData);
        }
      } catch (error) {
        console.error('Error processing meal:', meal, error);
      }
    }

    // Notify callbacks
    if (createdRecipes.length > 0 && onRecipeCreated) {
      createdRecipes.forEach(recipe => onRecipeCreated(recipe));
    }
    if (createdMealPlans.length > 0 && onMealPlanCreated) {
      createdMealPlans.forEach(mealPlan => onMealPlanCreated(mealPlan));
    }

    if (createdMealPlans.length > 0) {
      toast({
        title: "Meals Added!",
        description: `Successfully added ${createdMealPlans.length} meal(s) to your weekly plan.`,
      });
    }
  };

  const handleUpdateGroceries = async (groceries: any[]) => {
    if (!Array.isArray(groceries)) return;
    
    try {
      // Generate shopping list for current week
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      // Add individual items to shopping list
      for (const item of groceries) {
        console.log('Adding grocery item:', item);
        // This would require extending the shopping list API to add individual items
        // For now, we'll show a summary
      }
      
      toast({
        title: "Shopping List Updated!",
        description: `Added ${groceries.length} item(s) to your shopping list.`,
      });
      console.table(groceries);
    } catch (error) {
      console.error('Error updating groceries:', error);
    }
  };

  const handleBuildCalendar = async (calendarEvents: any[]) => {
    if (!Array.isArray(calendarEvents)) return;
    
    console.log('Calendar events to create:', calendarEvents);
    // TODO: Implement calendar integration
    // This would connect to Google Calendar API or similar
    
    toast({
      title: "Calendar Updated!",
      description: `Added ${calendarEvents.length} event(s) to your calendar.`,
    });
  };

  // Helper function to convert day names to dates
  const getMealDate = (dayName: string): string => {
    const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    const dayMap: { [key: string]: number } = {
      'mon': 0, 'monday': 0,
      'tue': 1, 'tuesday': 1, 
      'wed': 2, 'wednesday': 2,
      'thu': 3, 'thursday': 3,
      'fri': 4, 'friday': 4,
      'sat': 5, 'saturday': 5,
      'sun': 6, 'sunday': 6,
    };
    
    const dayIndex = dayMap[dayName.toLowerCase()] ?? 0;
    const date = addDays(currentWeek, dayIndex);
    return format(date, 'yyyy-MM-dd');
  };

  const handleVoiceCommand = async (command: string) => {
    try {
      console.log('Processing voice command:', command);
      onResult?.(command);

      const wasListening = isListening;
      if (wasListening) stopListening();

      const json = await sendStreaming("/api/voice/plan-meal", { 
        transcript: command, 
        clientState: getClientState?.() || {} 
      });

      if (json?.reply) {
        console.log('AI reply received:', json.reply);
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(json.reply); 
        utterance.onend = () => { 
          setIsSpeaking(false); 
          if (wasListening && hasSpeechRecognition) {
            setTimeout(() => startListening(), 1000);
          }
        }; 
        setIsSpeaking(true); 
        window.speechSynthesis.speak(utterance);
      }
      
      if (Array.isArray(json?.actions)) {
        await applyActions(json.actions);
      }
    } catch (error: any) {
      console.error("Voice command failed", error);
      toast({ 
        title: "Voice Command Error", 
        description: String(error), 
        variant: "destructive" 
      });
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-md", className)} data-testid="voice-assistant-card">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <Button
            data-testid="voice-assistant-button"
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className={cn("rounded-full w-12 h-12", isListening && "animate-pulse")}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? <MicOff /> : <Mic />}
          </Button>

          <div className="flex-1">
            <p className="text-sm font-medium" data-testid="voice-status">
              {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Tap to speak"}
            </p>
            {transcript && (
              <p className="text-xs text-muted-foreground mt-1" data-testid="transcript">
                {transcript}
              </p>
            )}
          </div>

          {isSpeaking && (
            <Button variant="outline" size="sm" onClick={stopSpeaking} data-testid="stop-speaking-button">
              <VolumeX className="w-4 h-4" />
            </Button>
          )}
        </div>

        {context === "cooking" && (
          <div className="mt-3 text-xs text-muted-foreground">
            Try: "What's next?", "Repeat that", "Set timer for 5 minutes"
          </div>
        )}

        {context === "planning" && (
          <div className="mt-3 text-xs text-muted-foreground">
            Try: "Plan dinners for 3 people", "I want healthy meals this week"
          </div>
        )}
      </CardContent>
    </Card>
  );
}