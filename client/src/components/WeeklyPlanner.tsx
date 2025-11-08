import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Users, Clock, Utensils } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { RecipeImportModal } from "@/components/RecipeImportModal";
import { RecipeSelectorModal } from "@/components/RecipeSelectorModal";
import type { MealPlan, Recipe } from "@shared/schema";

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface WeeklyPlannerProps {
  onCookingMode?: (recipe: Recipe) => void;
}

export function WeeklyPlanner({ onCookingMode }: WeeklyPlannerProps) {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedMealSlot, setSelectedMealSlot] = useState<{ date: string; mealSlot: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekStart = format(currentWeek, 'yyyy-MM-dd');
  const weekEnd = format(addDays(currentWeek, 6), 'yyyy-MM-dd');

  const { data: mealPlans = [], isLoading } = useQuery<MealPlan[]>({
    queryKey: ['/api/meal-plans', { startDate: weekStart, endDate: weekEnd }],
  });

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes'],
  });

  const addMealMutation = useMutation({
    mutationFn: async (mealPlan: { date: string; mealSlot: string; recipeId?: string }) => {
      return apiRequest('POST', '/api/meal-plans', mealPlan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      toast({
        title: "Meal Added",
        description: "Meal has been added to your plan.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add meal to plan.",
        variant: "destructive",
      });
    },
  });

  const removeMealMutation = useMutation({
    mutationFn: async (mealPlanId: string) => {
      return apiRequest('DELETE', `/api/meal-plans/${mealPlanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      toast({
        title: "Meal Removed",
        description: "Meal has been removed from your plan.",
      });
    },
  });

  const generateShoppingListMutation = useMutation({
    mutationFn: async () => {
      // Recalculate weekEnd fresh to ensure it's not undefined
      const start = format(currentWeek, 'yyyy-MM-dd');
      const end = format(addDays(currentWeek, 6), 'yyyy-MM-dd');

      const payload = {
        weekStart: start,
        weekEnd: end,
        title: `Shopping List - Week of ${format(currentWeek, 'MMM dd, yyyy')}`
      };

      console.log('[Shopping List Generate] Sending request:', payload);
      console.log('[Shopping List Generate] weekStart:', start);
      console.log('[Shopping List Generate] weekEnd:', end);

      return apiRequest('POST', '/api/shopping-lists/generate', payload);
    },
    onSuccess: () => {
      toast({
        title: "Shopping List Generated",
        description: "Your shopping list has been created.",
      });
    },
    onError: (error: any) => {
      console.error('[Shopping List Generate] Error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate shopping list.",
        variant: "destructive",
      });
    },
  });

  const getMealPlanForSlot = (date: Date, mealSlot: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return mealPlans.find((mp: MealPlan) => mp.date === dateStr && mp.mealSlot === mealSlot);
  };

  const getRecipeForMealPlan = (mealPlan: MealPlan) => {
    return recipes.find((r: Recipe) => r.id === mealPlan.recipeId);
  };

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else if (direction === 'next') {
      setCurrentWeek(addWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
  };

  const handleSelectRecipe = (recipeId: string) => {
    if (selectedMealSlot) {
      addMealMutation.mutate({
        ...selectedMealSlot,
        recipeId,
      });
      setSelectedMealSlot(null);
    }
  };

  const handleOpenRecipeSelector = (date: string, mealSlot: string) => {
    setSelectedMealSlot({ date, mealSlot });
    setShowRecipeSelector(true);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // WebSocket for real-time collaboration
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connected');
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'meal_plan_updated') {
            queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      socket.onerror = (error) => {
        console.warn('WebSocket error (real-time updates disabled):', error);
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
      };
    } catch (error) {
      console.warn('Failed to establish WebSocket connection:', error);
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [queryClient]);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-week-title">
              {format(currentWeek, 'MMMM dd')} - {format(addDays(currentWeek, 6), 'dd, yyyy')}
            </h2>
            <p className="text-muted-foreground">Weekly Meal Plan</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
              data-testid="button-previous-week"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('today')}
              data-testid="button-today"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
              data-testid="button-next-week"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowImportModal(true)}
            data-testid="button-import-recipe"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Recipe
          </Button>
          <Button
            variant="outline"
            onClick={() => generateShoppingListMutation.mutate()}
            disabled={generateShoppingListMutation.isPending}
            data-testid="button-generate-shopping-list"
          >
            <Utensils className="w-4 h-4 mr-2" />
            Generate Shopping List
          </Button>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day, dayIndex) => (
            <Card 
              key={dayIndex} 
              className={cn(
                "overflow-hidden",
                isToday(day) && "ring-2 ring-primary"
              )}
            >
              <CardHeader className="p-4 bg-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold" data-testid={`text-day-${dayIndex}`}>
                      {DAYS_OF_WEEK[dayIndex]}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {format(day, 'MMM dd')}
                    </p>
                  </div>
                  {isToday(day) && (
                    <Badge variant="default" className="text-xs">Today</Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {MEAL_SLOTS.map((mealSlot) => {
                  const mealPlan = getMealPlanForSlot(day, mealSlot);
                  const recipe = mealPlan ? getRecipeForMealPlan(mealPlan) : null;
                  
                  return (
                    <div key={mealSlot} className="p-3 border-b border-border last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground capitalize">
                          {mealSlot}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleOpenRecipeSelector(format(day, 'yyyy-MM-dd'), mealSlot)}
                          data-testid={`button-add-meal-${dayIndex}-${mealSlot}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      {recipe ? (
                        <div 
                          className="bg-muted rounded-lg p-3 cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => onCookingMode?.(recipe)}
                          data-testid={`card-meal-${dayIndex}-${mealSlot}`}
                        >
                          {recipe.imageUrl && (
                            <img 
                              src={recipe.imageUrl} 
                              alt={recipe.title}
                              className="w-full h-20 object-cover rounded-lg mb-2"
                            />
                          )}
                          <h4 className="font-medium text-sm">{recipe.title}</h4>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              {recipe.servings} servings
                            </p>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{(recipe.prepMinutes || 0) + (recipe.cookMinutes || 0)} min</span>
                            </div>
                          </div>
                          {mealPlan && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMealMutation.mutate(mealPlan.id);
                              }}
                              data-testid={`button-remove-meal-${mealPlan.id}`}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="bg-muted/50 rounded-lg p-3 border-2 border-dashed border-border">
                          <p className="text-xs text-muted-foreground text-center">
                            Click + to add meal
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Week Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-meals">
                    {mealPlans.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Meals Planned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-cook-time">
                    {Math.round(
                      mealPlans.reduce((total: number, mp: MealPlan) => {
                        const recipe = getRecipeForMealPlan(mp);
                        return total + ((recipe?.prepMinutes || 0) + (recipe?.cookMinutes || 0));
                      }, 0) / 60 * 10
                    ) / 10}h
                  </p>
                  <p className="text-sm text-muted-foreground">Cook Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-collaborators">1</p>
                  <p className="text-sm text-muted-foreground">Collaborators</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-unique-recipes">
                    {new Set(mealPlans.map((mp: MealPlan) => mp.recipeId).filter(Boolean)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Unique Recipes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecipeImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      <RecipeSelectorModal
        recipes={recipes}
        isOpen={showRecipeSelector}
        onClose={() => {
          setShowRecipeSelector(false);
          setSelectedMealSlot(null);
        }}
        onSelectRecipe={handleSelectRecipe}
      />
    </>
  );
}
