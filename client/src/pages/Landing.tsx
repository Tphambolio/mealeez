import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils, Calendar, Users, Mic, Smartphone, Clock } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Utensils className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">MealBuilder</h1>
              <p className="text-sm text-muted-foreground">Smart meal planning</p>
            </div>
          </div>
          
          <Button onClick={handleLogin} data-testid="button-login">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Plan Meals with
            <span className="text-primary"> AI Voice</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            The smartest way to plan your weekly meals with family collaboration, 
            voice control, and automatic shopping lists.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button size="lg" onClick={handleLogin} data-testid="button-start-planning">
              Start Planning Meals
            </Button>
            <Button variant="outline" size="lg" data-testid="button-learn-more">
              Learn More
            </Button>
          </div>
          
          {/* Demo Video Placeholder */}
          <div className="bg-muted rounded-2xl p-8 mb-12">
            <div className="aspect-video bg-card rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Smartphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Interactive Demo Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Everything You Need</h3>
          <p className="text-muted-foreground text-lg">
            Powerful features designed for modern families
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-primary-foreground" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Voice Control</h4>
              <p className="text-muted-foreground">
                "Plan chicken dinner for Tuesday" - ChatGPT powered voice assistant 
                makes meal planning as easy as talking.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Family Collaboration</h4>
              <p className="text-muted-foreground">
                Share meal plans with family members. Everyone can contribute 
                and see changes in real-time.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-accent-foreground" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Smart Calendar Sync</h4>
              <p className="text-muted-foreground">
                Automatic Google Calendar integration. Your meal plans sync 
                across all devices instantly.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-primary-foreground" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Mobile First</h4>
              <p className="text-muted-foreground">
                Progressive Web App optimized for mobile. Works offline and 
                installs like a native app.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Cooking Assistant</h4>
              <p className="text-muted-foreground">
                Step-by-step cooking guidance with voice commands, timers, 
                and AI-powered cooking tips.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <Utensils className="w-6 h-6 text-accent-foreground" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Recipe Import</h4>
              <p className="text-muted-foreground">
                Import recipes from any website, photo, or voice description. 
                AI automatically extracts ingredients and steps.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-8 text-center">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Transform Your Meal Planning?
            </h3>
            <p className="text-lg mb-6 opacity-90">
              Join thousands of families already using MealBuilder to save time 
              and eat better.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={handleLogin}
              data-testid="button-cta-signup"
            >
              Start Free Today
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p>&copy; 2024 MealBuilder. Made with ❤️ for busy families.</p>
      </footer>
    </div>
  );
}
