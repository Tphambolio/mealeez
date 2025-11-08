import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipes table
export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  servings: integer("servings").default(4),
  prepMinutes: integer("prep_minutes").default(0),
  cookMinutes: integer("cook_minutes").default(0),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ingredients table
export const ingredients = pgTable("ingredients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipeId: varchar("recipe_id").notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  raw: text("raw").notNull(),
  quantity: varchar("quantity"), // Changed from numeric to varchar to support fractions like "1/2"
  unit: varchar("unit"),
  item: text("item").notNull(),
  notes: text("notes"),
  aisle: varchar("aisle"),
});

// Steps table
export const steps = pgTable("steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipeId: varchar("recipe_id").notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  position: integer("position").notNull(),
  text: text("text").notNull(),
});

// Meal plans table
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: varchar("recipe_id").references(() => recipes.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  mealSlot: varchar("meal_slot").notNull(), // breakfast, lunch, dinner, snack
  servingsOverride: integer("servings_override"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping lists table
export const shoppingLists = pgTable("shopping_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  weekStart: date("week_start").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping list items table
export const shoppingListItems = pgTable("shopping_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").notNull().references(() => shoppingLists.id, { onDelete: 'cascade' }),
  ingredientId: varchar("ingredient_id").references(() => ingredients.id),
  item: text("item").notNull(),
  quantity: varchar("quantity"), // Changed from numeric to varchar to support fractions like "1/2"
  unit: varchar("unit"),
  aisle: varchar("aisle"),
  checked: boolean("checked").default(false),
  store: varchar("store"),
});

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  defaultServings: integer("default_servings").default(4),
  voiceEnabled: boolean("voice_enabled").default(true),
  storeMap: jsonb("store_map"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Collaboration groups table
export const collaborationGroups = pgTable("collaboration_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Group members table
export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => collaborationGroups.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar("role").notNull().default('member'), // owner, admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  recipes: many(recipes),
  mealPlans: many(mealPlans),
  shoppingLists: many(shoppingLists),
  preferences: one(userPreferences),
  ownedGroups: many(collaborationGroups),
  groupMemberships: many(groupMembers),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, { fields: [recipes.userId], references: [users.id] }),
  ingredients: many(ingredients),
  steps: many(steps),
  mealPlans: many(mealPlans),
}));

export const ingredientsRelations = relations(ingredients, ({ one, many }) => ({
  recipe: one(recipes, { fields: [ingredients.recipeId], references: [recipes.id] }),
  shoppingListItems: many(shoppingListItems),
}));

export const stepsRelations = relations(steps, ({ one }) => ({
  recipe: one(recipes, { fields: [steps.recipeId], references: [recipes.id] }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  user: one(users, { fields: [mealPlans.userId], references: [users.id] }),
  recipe: one(recipes, { fields: [mealPlans.recipeId], references: [recipes.id] }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
  user: one(users, { fields: [shoppingLists.userId], references: [users.id] }),
  items: many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  list: one(shoppingLists, { fields: [shoppingListItems.listId], references: [shoppingLists.id] }),
  ingredient: one(ingredients, { fields: [shoppingListItems.ingredientId], references: [ingredients.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const collaborationGroupsRelations = relations(collaborationGroups, ({ one, many }) => ({
  owner: one(users, { fields: [collaborationGroups.ownerId], references: [users.id] }),
  members: many(groupMembers),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(collaborationGroups, { fields: [groupMembers.groupId], references: [collaborationGroups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIngredientSchema = createInsertSchema(ingredients).omit({ id: true });
export const insertStepSchema = createInsertSchema(steps).omit({ id: true });
export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({ id: true, createdAt: true });
export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({ id: true, createdAt: true });
export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({ id: true });
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ createdAt: true, updatedAt: true });
export const insertCollaborationGroupSchema = createInsertSchema(collaborationGroups).omit({ id: true, createdAt: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true, joinedAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Step = typeof steps.$inferSelect;
export type InsertStep = z.infer<typeof insertStepSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type CollaborationGroup = typeof collaborationGroups.$inferSelect;
export type InsertCollaborationGroup = z.infer<typeof insertCollaborationGroupSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
