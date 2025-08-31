import { useState } from "react";
import { WeeklyPlanner } from "@/components/WeeklyPlanner";
import { CookingMode } from "@/components/CookingMode";
import { MobileNavigation } from "@/components/MobileNavigation";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Utensils, Settings, LogOut, Mic } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Recipe } from "@shared/schema";

export default function Home() {
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: preferences } = useQuery({
    queryKey: ['/api/settings'],
  });

  const handleCookingMode = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowCookingMode(true);
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const handleVoiceMealPlanCreated = async (mealPlans: any[]) => {
    try {
      for (const mealPlan of mealPlans) {
        await apiRequest('POST', '/api/meal-plans', mealPlan);
      }
      
      // Refresh meal plans to show new additions
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      
      toast({
        title: "Meal plans created!",
        description: `Added ${mealPlans.length} meal plan(s) to your weekly schedule.`,
      });
    } catch (error) {
      console.error('Error creating meal plans:', error);
      toast({
        title: "Error",
        description: "Failed to create meal plans. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVoiceRecipeCreated = async (recipe: any) => {
    try {
      await apiRequest('POST', '/api/recipes', recipe);
      
      // Refresh recipes to show new addition
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      
      toast({
        title: "Recipe created!",
        description: `Added "${recipe.title}" to your recipe library.`,
      });
    } catch (error) {
      console.error('Error creating recipe:', error);
      toast({
        title: "Error",
        description: "Failed to create recipe. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (showCookingMode && selectedRecipe) {
    return (
      <CookingMode 
        recipe={selectedRecipe} 
        onExit={() => {
          setShowCookingMode(false);
          setSelectedRecipe(null);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Utensils className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">MealBuilder</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
              className={showVoiceAssistant ? "bg-secondary text-secondary-foreground" : ""}
              data-testid="button-mobile-voice"
            >
              <Mic className="w-4 h-4" />
            </Button>
            
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-card border-r border-border">
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Utensils className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">MealBuilder</h1>
                <p className="text-sm text-muted-foreground">Smart meal planning</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <a href="#" className="flex items-center space-x-3 px-3 py-2 bg-primary text-primary-foreground rounded-lg">
              <Utensils className="w-4 h-4" />
              <span>Weekly Planner</span>
            </a>
            <a href="/recipes" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
              <Utensils className="w-4 h-4" />
              <span>Recipe Library</span>
            </a>
            <a href="/shopping" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
              <Utensils className="w-4 h-4" />
              <span>Shopping Lists</span>
            </a>
            <a href="/settings" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </a>
          </nav>
          
          {/* User Section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium" data-testid="text-user-name">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">Premium Plan</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
                className={showVoiceAssistant ? "bg-secondary text-secondary-foreground" : ""}
                data-testid="button-desktop-voice"
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="p-4 lg:p-6">
            {/* Voice Assistant */}
            {showVoiceAssistant && (
              <Card className="mb-6">
                <CardHeader>
                  <h3 className="font-semibold">Voice Assistant</h3>
                </CardHeader>
                <CardContent>
                  <VoiceAssistant
                    context="planning"
                    userName={user?.firstName || undefined}
                    autoStart={true}
                    onResult={(result) => {
                      console.log('Voice result:', result);
                    }}
                    onMealPlanCreated={handleVoiceMealPlanCreated}
                    onRecipeCreated={handleVoiceRecipeCreated}
                  />
                </CardContent>
              </Card>
            )}
            
            {/* Weekly Planner */}
            <WeeklyPlanner onCookingMode={handleCookingMode} />
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Floating Voice Assistant Button (Mobile) */}
      <div className="lg:hidden fixed bottom-20 right-4 z-30">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg"
          onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
          data-testid="button-floating-voice"
        >
          <Mic className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
