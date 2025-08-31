import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Play, 
  Pause, 
  Square,
  Mic
} from "lucide-react";
import { VoiceAssistant } from "./VoiceAssistant";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { Recipe, Step } from "@shared/schema";

interface CookingModeProps {
  recipe: Recipe;
  onExit: () => void;
}

export function CookingMode({ recipe, onExit }: CookingModeProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);

  const { data: steps = [] } = useQuery<Step[]>({
    queryKey: [`/api/recipes/${recipe.id}/steps`],
    enabled: !!recipe.id,
  });

  const currentStep = steps[currentStepIndex] as Step | undefined;
  const totalSteps = steps.length;

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            // Timer finished - could add notification here
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timer]);

  const nextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const startTimer = (minutes: number) => {
    setTimer(minutes * 60);
    setIsTimerRunning(true);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setTimer(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('next') || lowerCommand.includes('continue')) {
      nextStep();
    } else if (lowerCommand.includes('previous') || lowerCommand.includes('back')) {
      previousStep();
    } else if (lowerCommand.includes('repeat')) {
      // Could implement text-to-speech here
    } else if (lowerCommand.includes('timer')) {
      const match = lowerCommand.match(/(\d+)\s*min/);
      if (match) {
        startTimer(parseInt(match[1]));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-accent text-accent-foreground p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-accent-foreground hover:bg-accent-foreground/20"
            data-testid="button-exit-cooking"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-semibold" data-testid="text-recipe-title">
              {recipe.title}
            </h2>
            <p className="text-sm opacity-90">
              Step {currentStepIndex + 1} of {totalSteps}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
            className="text-accent-foreground hover:bg-accent-foreground/20"
            data-testid="button-toggle-voice"
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startTimer(5)}
            className="text-accent-foreground hover:bg-accent-foreground/20"
            data-testid="button-quick-timer"
          >
            <Clock className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Recipe Image */}
        {recipe.imageUrl && (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title}
            className="w-full h-48 object-cover rounded-xl"
          />
        )}
        
        {/* Current Step */}
        {currentStep && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Current Step</h3>
                <Badge variant="secondary">
                  {currentStepIndex + 1}/{totalSteps}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed" data-testid="text-current-step">
                {currentStep.text}
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Timer */}
        {timer > 0 && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Active Timer</h4>
                  <p className="text-2xl font-bold" data-testid="text-timer">
                    {formatTime(timer)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTimer}
                    className="text-primary-foreground hover:bg-primary-foreground/20"
                    data-testid="button-toggle-timer"
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopTimer}
                    className="text-primary-foreground hover:bg-primary-foreground/20"
                    data-testid="button-stop-timer"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Voice Assistant */}
        {showVoiceAssistant && (
          <VoiceAssistant
            onResult={handleVoiceCommand}
            context="cooking"
            recipeContext={recipe}
            currentStep={currentStep}
          />
        )}
        
        {/* Quick Timer Buttons */}
        <Card>
          <CardHeader>
            <h4 className="font-medium">Quick Timers</h4>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 15].map((minutes) => (
                <Button
                  key={minutes}
                  variant="outline"
                  size="sm"
                  onClick={() => startTimer(minutes)}
                  data-testid={`button-timer-${minutes}`}
                >
                  {minutes}m
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Voice Commands */}
        <Card className="bg-secondary text-secondary-foreground">
          <CardHeader>
            <h4 className="font-medium">Voice Commands</h4>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Badge variant="outline" className="justify-center">
                "Next step"
              </Badge>
              <Badge variant="outline" className="justify-center">
                "Previous"
              </Badge>
              <Badge variant="outline" className="justify-center">
                "Set timer 5 minutes"
              </Badge>
              <Badge variant="outline" className="justify-center">
                "Repeat"
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Navigation Controls */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStepIndex === 0}
            data-testid="button-previous-step"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {/* Step Indicators */}
          <div className="flex space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full",
                  i === currentStepIndex ? "bg-primary" : "bg-muted"
                )}
                data-testid={`step-indicator-${i}`}
              />
            ))}
          </div>
          
          <Button
            onClick={nextStep}
            disabled={currentStepIndex === totalSteps - 1}
            data-testid="button-next-step"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
