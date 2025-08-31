import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Mic, 
  Users,
  Calendar,
  ShoppingCart,
  Save,
  Utensils
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MobileNavigation } from "@/components/MobileNavigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserPreferencesSchema } from "@shared/schema";
import type { UserPreferences } from "@shared/schema";
import { z } from "zod";

const settingsSchema = insertUserPreferencesSchema.extend({
  defaultServings: z.number().min(1).max(20).optional(),
  voiceEnabled: z.boolean().optional(),
  storeMap: z.any().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ['/api/settings'],
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return apiRequest('PUT', '/api/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      defaultServings: preferences?.defaultServings || 4,
      voiceEnabled: preferences?.voiceEnabled ?? true,
      storeMap: preferences?.storeMap || {},
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updatePreferencesMutation.mutate(data);
  };

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
              <SettingsIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
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
            <a href="/shopping" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
              <ShoppingCart className="w-4 h-4" />
              <span>Shopping Lists</span>
            </a>
            <a href="/settings" className="flex items-center space-x-3 px-3 py-2 bg-primary text-primary-foreground rounded-lg">
              <SettingsIcon className="w-4 h-4" />
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
                <h2 className="text-2xl font-bold" data-testid="text-page-title">Settings</h2>
                <p className="text-muted-foreground">Manage your preferences and account</p>
              </div>
              
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={!isDirty || updatePreferencesMutation.isPending}
                data-testid="button-save-settings"
              >
                <Save className="w-4 h-4 mr-2" />
                {updatePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Profile Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <CardTitle>Profile</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={user?.profileImageUrl || undefined} />
                      <AvatarFallback className="text-lg">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {user?.firstName} {user?.lastName}
                      </h3>
                      <p className="text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Meal Planning Preferences */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Utensils className="w-5 h-5" />
                    <CardTitle>Meal Planning</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultServings">Default Servings</Label>
                    <Input
                      id="defaultServings"
                      type="number"
                      min="1"
                      max="20"
                      {...register('defaultServings', { valueAsNumber: true })}
                      data-testid="input-default-servings"
                    />
                    <p className="text-sm text-muted-foreground">
                      Default number of servings for new recipes
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Voice Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Mic className="w-5 h-5" />
                    <CardTitle>Voice Assistant</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Enable Voice Control</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow voice commands for meal planning and cooking
                      </p>
                    </div>
                    <Switch
                      checked={watch('voiceEnabled')}
                      onCheckedChange={(checked) => setValue('voiceEnabled', checked)}
                      data-testid="switch-voice-enabled"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Shopping Preferences */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5" />
                    <CardTitle>Shopping Lists</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeLayout">Store Layout (JSON)</Label>
                    <Textarea
                      id="storeLayout"
                      placeholder='{"produce": 1, "dairy": 2, "meat": 3, "bakery": 4}'
                      className="min-h-[100px] font-mono"
                      defaultValue={JSON.stringify(preferences?.storeMap || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setValue('storeMap', parsed);
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      data-testid="textarea-store-layout"
                    />
                    <p className="text-sm text-muted-foreground">
                      Customize aisle organization for your preferred store
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Collaboration Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <CardTitle>Family Collaboration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Family Groups</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Manage who can view and edit your meal plans
                      </p>
                      <Button variant="outline" data-testid="button-manage-groups">
                        <Users className="w-4 h-4 mr-2" />
                        Manage Groups
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calendar Integration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <CardTitle>Calendar Integration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Google Calendar Sync</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Automatically sync meal plans to your Google Calendar
                      </p>
                      <Button variant="outline" data-testid="button-connect-calendar">
                        <Calendar className="w-4 h-4 mr-2" />
                        Connect Google Calendar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5" />
                    <CardTitle>Notifications</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Meal Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about upcoming meal prep times
                      </p>
                    </div>
                    <Switch data-testid="switch-meal-reminders" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Shopping Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get reminded to check your shopping list
                      </p>
                    </div>
                    <Switch data-testid="switch-shopping-reminders" />
                  </div>
                </CardContent>
              </Card>

              {/* Account Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" data-testid="button-export-data">
                      Export Data
                    </Button>
                    <Button variant="outline" data-testid="button-import-data">
                      Import Data
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleLogout}
                      data-testid="button-sign-out"
                    >
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
}
