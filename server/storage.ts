import {
  users,
  recipes,
  ingredients,
  steps,
  mealPlans,
  shoppingLists,
  shoppingListItems,
  userPreferences,
  collaborationGroups,
  groupMembers,
  type User,
  type UpsertUser,
  type Recipe,
  type InsertRecipe,
  type Ingredient,
  type InsertIngredient,
  type Step,
  type InsertStep,
  type MealPlan,
  type InsertMealPlan,
  type ShoppingList,
  type InsertShoppingList,
  type ShoppingListItem,
  type InsertShoppingListItem,
  type UserPreferences,
  type InsertUserPreferences,
  type CollaborationGroup,
  type InsertCollaborationGroup,
  type GroupMember,
  type InsertGroupMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Recipe operations
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  getRecipesByUser(userId: string): Promise<Recipe[]>;
  updateRecipe(id: string, recipe: Partial<InsertRecipe>): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;
  
  // Ingredient operations
  createIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  getIngredientsByRecipe(recipeId: string): Promise<Ingredient[]>;
  updateIngredient(id: string, ingredient: Partial<InsertIngredient>): Promise<Ingredient>;
  deleteIngredient(id: string): Promise<void>;
  
  // Step operations
  createStep(step: InsertStep): Promise<Step>;
  getStepsByRecipe(recipeId: string): Promise<Step[]>;
  updateStep(id: string, step: Partial<InsertStep>): Promise<Step>;
  deleteStep(id: string): Promise<void>;
  
  // Meal plan operations
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getMealPlansByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<MealPlan[]>;
  updateMealPlan(id: string, mealPlan: Partial<InsertMealPlan>): Promise<MealPlan>;
  deleteMealPlan(id: string): Promise<void>;
  
  // Shopping list operations
  createShoppingList(shoppingList: InsertShoppingList): Promise<ShoppingList>;
  getShoppingListByUserAndWeek(userId: string, weekStart: string): Promise<ShoppingList | undefined>;
  updateShoppingList(id: string, shoppingList: Partial<InsertShoppingList>): Promise<ShoppingList>;
  deleteShoppingList(id: string): Promise<void>;
  
  // Shopping list item operations
  createShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem>;
  getShoppingListItems(listId: string): Promise<ShoppingListItem[]>;
  updateShoppingListItem(id: string, item: Partial<InsertShoppingListItem>): Promise<ShoppingListItem>;
  deleteShoppingListItem(id: string): Promise<void>;
  
  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  
  // Collaboration operations
  createCollaborationGroup(group: InsertCollaborationGroup): Promise<CollaborationGroup>;
  getCollaborationGroup(id: string): Promise<CollaborationGroup | undefined>;
  getGroupsByUser(userId: string): Promise<CollaborationGroup[]>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
  removeGroupMember(groupId: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Recipe operations
  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [newRecipe] = await db.insert(recipes).values(recipe).returning();
    return newRecipe;
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async getRecipesByUser(userId: string): Promise<Recipe[]> {
    return await db.select().from(recipes).where(eq(recipes.userId, userId)).orderBy(desc(recipes.createdAt));
  }

  async updateRecipe(id: string, recipe: Partial<InsertRecipe>): Promise<Recipe> {
    const [updatedRecipe] = await db
      .update(recipes)
      .set({ ...recipe, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    return updatedRecipe;
  }

  async deleteRecipe(id: string): Promise<void> {
    await db.delete(recipes).where(eq(recipes.id, id));
  }

  // Ingredient operations
  async createIngredient(ingredient: InsertIngredient): Promise<Ingredient> {
    const [newIngredient] = await db.insert(ingredients).values(ingredient).returning();
    return newIngredient;
  }

  async getIngredientsByRecipe(recipeId: string): Promise<Ingredient[]> {
    return await db.select().from(ingredients).where(eq(ingredients.recipeId, recipeId));
  }

  async updateIngredient(id: string, ingredient: Partial<InsertIngredient>): Promise<Ingredient> {
    const [updatedIngredient] = await db
      .update(ingredients)
      .set(ingredient)
      .where(eq(ingredients.id, id))
      .returning();
    return updatedIngredient;
  }

  async deleteIngredient(id: string): Promise<void> {
    await db.delete(ingredients).where(eq(ingredients.id, id));
  }

  // Step operations
  async createStep(step: InsertStep): Promise<Step> {
    const [newStep] = await db.insert(steps).values(step).returning();
    return newStep;
  }

  async getStepsByRecipe(recipeId: string): Promise<Step[]> {
    return await db.select().from(steps).where(eq(steps.recipeId, recipeId)).orderBy(asc(steps.position));
  }

  async updateStep(id: string, step: Partial<InsertStep>): Promise<Step> {
    const [updatedStep] = await db
      .update(steps)
      .set(step)
      .where(eq(steps.id, id))
      .returning();
    return updatedStep;
  }

  async deleteStep(id: string): Promise<void> {
    await db.delete(steps).where(eq(steps.id, id));
  }

  // Meal plan operations
  async createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan> {
    const [newMealPlan] = await db.insert(mealPlans).values(mealPlan).returning();
    return newMealPlan;
  }

  async getMealPlansByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<MealPlan[]> {
    return await db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, userId),
          gte(mealPlans.date, startDate),
          lte(mealPlans.date, endDate)
        )
      )
      .orderBy(asc(mealPlans.date));
  }

  async updateMealPlan(id: string, mealPlan: Partial<InsertMealPlan>): Promise<MealPlan> {
    const [updatedMealPlan] = await db
      .update(mealPlans)
      .set(mealPlan)
      .where(eq(mealPlans.id, id))
      .returning();
    return updatedMealPlan;
  }

  async deleteMealPlan(id: string): Promise<void> {
    await db.delete(mealPlans).where(eq(mealPlans.id, id));
  }

  // Shopping list operations
  async createShoppingList(shoppingList: InsertShoppingList): Promise<ShoppingList> {
    const [newShoppingList] = await db.insert(shoppingLists).values(shoppingList).returning();
    return newShoppingList;
  }

  async getShoppingListByUserAndWeek(userId: string, weekStart: string): Promise<ShoppingList | undefined> {
    const [shoppingList] = await db
      .select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userId, userId),
          eq(shoppingLists.weekStart, weekStart)
        )
      );
    return shoppingList;
  }

  async updateShoppingList(id: string, shoppingList: Partial<InsertShoppingList>): Promise<ShoppingList> {
    const [updatedShoppingList] = await db
      .update(shoppingLists)
      .set(shoppingList)
      .where(eq(shoppingLists.id, id))
      .returning();
    return updatedShoppingList;
  }

  async deleteShoppingList(id: string): Promise<void> {
    await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
  }

  // Shopping list item operations
  async createShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem> {
    const [newItem] = await db.insert(shoppingListItems).values(item).returning();
    return newItem;
  }

  async getShoppingListItems(listId: string): Promise<ShoppingListItem[]> {
    return await db.select().from(shoppingListItems).where(eq(shoppingListItems.listId, listId));
  }

  async updateShoppingListItem(id: string, item: Partial<InsertShoppingListItem>): Promise<ShoppingListItem> {
    const [updatedItem] = await db
      .update(shoppingListItems)
      .set(item)
      .where(eq(shoppingListItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteShoppingListItem(id: string): Promise<void> {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [upsertedPreferences] = await db
      .insert(userPreferences)
      .values(preferences)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedPreferences;
  }

  // Collaboration operations
  async createCollaborationGroup(group: InsertCollaborationGroup): Promise<CollaborationGroup> {
    const [newGroup] = await db.insert(collaborationGroups).values(group).returning();
    return newGroup;
  }

  async getCollaborationGroup(id: string): Promise<CollaborationGroup | undefined> {
    const [group] = await db.select().from(collaborationGroups).where(eq(collaborationGroups.id, id));
    return group;
  }

  async getGroupsByUser(userId: string): Promise<CollaborationGroup[]> {
    const results = await db
      .select({
        id: collaborationGroups.id,
        name: collaborationGroups.name,
        ownerId: collaborationGroups.ownerId,
        createdAt: collaborationGroups.createdAt,
      })
      .from(collaborationGroups)
      .innerJoin(groupMembers, eq(collaborationGroups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId));
    
    return results;
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const [newMember] = await db.insert(groupMembers).values(member).returning();
    return newMember;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
