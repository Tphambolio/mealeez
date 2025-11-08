import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  Clock,
  Users,
  Edit,
  Trash2,
  ChefHat,
  Filter,
  BookOpen,
  Utensils
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MobileNavigation } from "@/components/MobileNavigation";
import { RecipeImportModal } from "@/components/RecipeImportModal";
import { RecipeDetailModal } from "@/components/RecipeDetailModal";
import { cn } from "@/lib/utils";
import type { Recipe } from "@shared/schema";

export default function RecipeLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes'],
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      return apiRequest('DELETE', `/api/recipes/${recipeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: "Recipe Deleted",
        description: "Recipe has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recipe.",
        variant: "destructive",
      });
    },
  });

  const filteredRecipes = recipes.filter((recipe: Recipe) => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const categories = ['all', 'breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Recipe Library</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImportModal(true)}
              data-testid="button-mobile-add-recipe"
            >
              <Plus className="w-4 h-4" />
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
            <a href="/" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
              <Utensils className="w-4 h-4" />
              <span>Weekly Planner</span>
            </a>
            <a href="/recipes" className="flex items-center space-x-3 px-3 py-2 bg-primary text-primary-foreground rounded-lg">
              <BookOpen className="w-4 h-4" />
              <span>Recipe Library</span>
            </a>
            <a href="/shopping" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
              <Utensils className="w-4 h-4" />
              <span>Shopping Lists</span>
            </a>
            <a href="/settings" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
              <Utensils className="w-4 h-4" />
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
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full"
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="p-4 lg:p-6 space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold" data-testid="text-page-title">Recipe Library</h2>
                <p className="text-muted-foreground">Manage your recipe collection</p>
              </div>
              
              <Button
                onClick={() => setShowImportModal(true)}
                className="hidden lg:flex"
                data-testid="button-add-recipe"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Recipe
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-recipes"
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="whitespace-nowrap"
                    data-testid={`button-filter-${category}`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Recipe Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="h-48 bg-muted animate-pulse" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2 animate-pulse" />
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredRecipes.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recipes Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "Try a different search term" : "Start building your recipe collection"}
                  </p>
                  <Button onClick={() => setShowImportModal(true)} data-testid="button-add-first-recipe">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Recipe
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe: Recipe) => (
                  <Card
                    key={recipe.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        <ChefHat className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg leading-tight" data-testid={`text-recipe-title-${recipe.id}`}>
                          {recipe.title}
                        </h3>
                        <div className="flex space-x-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement edit functionality
                            }}
                            data-testid={`button-edit-recipe-${recipe.id}`}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRecipeMutation.mutate(recipe.id);
                            }}
                            data-testid={`button-delete-recipe-${recipe.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {recipe.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {recipe.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{recipe.servings || 4}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{(recipe.prepMinutes || 0) + (recipe.cookMinutes || 0)}m</span>
                          </div>
                        </div>
                        
                        {recipe.sourceUrl && (
                          <Badge variant="secondary" className="text-xs">
                            Imported
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Recipe Import Modal */}
      <RecipeImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={selectedRecipe !== null}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}
