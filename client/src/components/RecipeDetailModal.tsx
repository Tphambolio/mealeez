import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, ExternalLink, ChefHat } from "lucide-react";
import type { Recipe, Ingredient, Step } from "@shared/schema";

interface RecipeDetailModalProps {
  recipe: Recipe & { ingredients?: Ingredient[]; steps?: Step[] } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RecipeDetailModal({ recipe, isOpen, onClose }: RecipeDetailModalProps) {
  if (!recipe) return null;

  const totalTime = (recipe.prepMinutes || 0) + (recipe.cookMinutes || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{recipe.title}</DialogTitle>
          <DialogDescription>
            {recipe.description || "View recipe details, ingredients, and cooking instructions"}
          </DialogDescription>
        </DialogHeader>

        {/* Recipe Image */}
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-64 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
            <ChefHat className="w-16 h-16 text-muted-foreground" />
          </div>
        )}

        {/* Recipe Metadata */}
        <div className="flex items-center gap-4 flex-wrap">
          {recipe.servings && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{recipe.servings} servings</span>
            </div>
          )}
          {totalTime > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {recipe.prepMinutes ? `${recipe.prepMinutes}m prep` : ""}
                {recipe.prepMinutes && recipe.cookMinutes ? " + " : ""}
                {recipe.cookMinutes ? `${recipe.cookMinutes}m cook` : ""}
              </span>
            </div>
          )}
          {recipe.sourceUrl && (
            <Badge variant="secondary" className="text-xs">
              Imported
            </Badge>
          )}
        </div>

        {/* Description */}
        {recipe.description && (
          <div>
            <p className="text-muted-foreground">{recipe.description}</p>
          </div>
        )}

        <Separator />

        {/* Ingredients */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
          {recipe.ingredients && recipe.ingredients.length > 0 ? (
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    {ingredient.quantity && (
                      <span className="font-medium">{ingredient.quantity} </span>
                    )}
                    {ingredient.unit && (
                      <span className="font-medium">{ingredient.unit} </span>
                    )}
                    <span>{ingredient.item}</span>
                    {ingredient.notes && (
                      <span className="text-muted-foreground italic"> ({ingredient.notes})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No ingredients listed</p>
          )}
        </div>

        <Separator />

        {/* Instructions */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Instructions</h3>
          {recipe.steps && recipe.steps.length > 0 ? (
            <ol className="space-y-4">
              {recipe.steps
                .sort((a, b) => a.position - b.position)
                .map((step, index) => (
                  <li key={step.id} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <p className="flex-1 pt-0.5">{step.text}</p>
                  </li>
                ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">No instructions provided</p>
          )}
        </div>

        {/* Source Link */}
        {recipe.sourceUrl && (
          <div className="pt-4">
            <Button variant="outline" asChild className="w-full">
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Original Recipe
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
