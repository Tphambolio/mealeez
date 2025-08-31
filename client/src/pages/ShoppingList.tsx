import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Check, 
  Calendar,
  Download,
  Share,
  Filter,
  Utensils
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MobileNavigation } from "@/components/MobileNavigation";
import { format, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { ShoppingList as ShoppingListType, ShoppingListItem } from "@shared/schema";

export default function ShoppingList() {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [newItemText, setNewItemText] = useState('');
  const [filterAisle, setFilterAisle] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekStart = format(currentWeek, 'yyyy-MM-dd');

  const { data: shoppingList, isLoading } = useQuery<ShoppingListType>({
    queryKey: ['/api/shopping-lists/week', weekStart],
    queryFn: async () => {
      // First try to get existing list
      try {
        const response = await apiRequest('POST', '/api/shopping-lists/generate', {
          weekStart,
          title: `Shopping List - Week of ${format(currentWeek, 'MMM dd, yyyy')}`
        });
        return await response.json();
      } catch (error) {
        return null;
      }
    }
  });

  const { data: items = [] } = useQuery<ShoppingListItem[]>({
    queryKey: ['/api/shopping-lists', shoppingList?.id],
    enabled: !!shoppingList?.id,
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<ShoppingListItem> }) => {
      return apiRequest('PUT', `/api/shopping-lists/${shoppingList?.id}/items/${itemId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists', shoppingList?.id] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (itemData: { item: string; quantity?: string; aisle?: string }) => {
      return apiRequest('POST', '/api/shopping-lists/items', {
        listId: shoppingList?.id,
        ...itemData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists', shoppingList?.id] });
      setNewItemText('');
      toast({
        title: "Item Added",
        description: "Item has been added to your shopping list.",
      });
    },
  });

  const generateListMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/shopping-lists/generate', {
        weekStart,
        title: `Shopping List - Week of ${format(currentWeek, 'MMM dd, yyyy')}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists/week', weekStart] });
      toast({
        title: "Shopping List Generated",
        description: "Your shopping list has been updated with this week's meals.",
      });
    },
  });

  const toggleItemChecked = (item: ShoppingListItem) => {
    updateItemMutation.mutate({
      itemId: item.id,
      updates: { checked: !item.checked }
    });
  };

  const addNewItem = () => {
    if (newItemText.trim() && shoppingList) {
      addItemMutation.mutate({
        item: newItemText.trim()
      });
    }
  };

  const aisles = Array.from(new Set(items.map(item => item.aisle).filter(Boolean)));
  const filteredItems = items.filter(item => 
    filterAisle === 'all' || item.aisle === filterAisle
  );

  const checkedCount = items.filter(item => item.checked).length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

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
              <ShoppingCart className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Shopping List</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateListMutation.mutate()}
              disabled={generateListMutation.isPending}
              data-testid="button-mobile-generate"
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
            <a href="/recipes" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
              <Utensils className="w-4 h-4" />
              <span>Recipe Library</span>
            </a>
            <a href="/shopping" className="flex items-center space-x-3 px-3 py-2 bg-primary text-primary-foreground rounded-lg">
              <ShoppingCart className="w-4 h-4" />
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold" data-testid="text-page-title">
                  Shopping List
                </h2>
                <p className="text-muted-foreground">
                  Week of {format(currentWeek, 'MMM dd, yyyy')}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateListMutation.mutate()}
                  disabled={generateListMutation.isPending}
                  data-testid="button-regenerate-list"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {generateListMutation.isPending ? "Generating..." : "Generate from Meals"}
                </Button>
                
                <Button
                  variant="outline"
                  data-testid="button-share-list"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Progress */}
            {totalCount > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Shopping Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {checkedCount} of {totalCount} items
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {completionPercentage}% complete
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Add New Item */}
            {shoppingList && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new item..."
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
                      data-testid="input-new-item"
                    />
                    <Button 
                      onClick={addNewItem}
                      disabled={!newItemText.trim() || addItemMutation.isPending}
                      data-testid="button-add-item"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Aisle Filter */}
            {aisles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                <Button
                  variant={filterAisle === 'all' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterAisle('all')}
                  data-testid="button-filter-all"
                >
                  All
                </Button>
                {aisles.map((aisle) => (
                  <Button
                    key={aisle}
                    variant={filterAisle === aisle ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterAisle(aisle || 'all')}
                    className="whitespace-nowrap"
                    data-testid={`button-filter-${aisle}`}
                  >
                    {aisle}
                  </Button>
                ))}
              </div>
            )}

            {/* Shopping List Items */}
            {isLoading ? (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                        <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : !shoppingList ? (
              <Card className="text-center py-12">
                <CardContent>
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Shopping List Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate a shopping list from your meal plans
                  </p>
                  <Button 
                    onClick={() => generateListMutation.mutate()}
                    disabled={generateListMutation.isPending}
                    data-testid="button-create-first-list"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Generate Shopping List
                  </Button>
                </CardContent>
              </Card>
            ) : filteredItems.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">No items in this category</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{shoppingList.title}</h3>
                    <Badge variant="secondary">
                      {filteredItems.length} items
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {filteredItems.map((item: ShoppingListItem, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center space-x-3 p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors",
                          item.checked && "opacity-60"
                        )}
                      >
                        <Checkbox
                          checked={item.checked || false}
                          onCheckedChange={() => toggleItemChecked(item)}
                          data-testid={`checkbox-item-${index}`}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={cn(
                              "font-medium",
                              item.checked && "line-through text-muted-foreground"
                            )}>
                              {item.item}
                            </p>
                            {item.quantity && (
                              <span className="text-sm text-muted-foreground">
                                {item.quantity} {item.unit}
                              </span>
                            )}
                          </div>
                          {item.aisle && (
                            <p className="text-sm text-muted-foreground">
                              {item.aisle}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          data-testid={`button-delete-item-${index}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
}
