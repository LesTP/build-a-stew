# Design restatement: technique-first cooking builder

The app is a **timeline-first, technique-driven cooking assistant**. It is not primarily a recipe database, ingredient encyclopedia, or drag-and-drop card game.

The core flow is:

```text
1. Select cooking technique
2. Optionally select cuisine style
3. Add anchor ingredient(s)
4. Work through a technique-specific timeline
5. At each step, choose from ranked ingredient suggestions
6. Inspect details when needed
7. Watch balance update globally
8. Generate the cooking method
```

The guiding idea:

> Technique determines the steps.
> Cuisine, anchors, already-selected ingredients, balance, and cooking time determine what gets suggested at each step.

---

# 1. Main user workflow

The user starts by choosing a **technique**:

```text
Braise / stew
Curry
Pasta
Soup
Fried rice
Tacos / wraps
Hand pies / pirozhki
Grain bowl
```

Then they optionally choose a **cuisine direction**:

```text
Any
French-ish
Italian-ish
Mexican-ish
Indian-ish
Thai-ish
East Asian-ish
Middle Eastern-ish
Miso / mushroom
etc.
```

Then they add one or more **anchor ingredients** — the ingredients they actually want or need to use:

```text
oxtail
barley
rutabaga
chickpeas
mushrooms
chicken thighs
leftover thick stew
```

The app then opens a cooking timeline for the chosen technique and starts ranking ingredients at each step.

Example:

```text
Technique: Braise / stew
Cuisine: Mexican-ish
Anchors: Oxtail, barley

Timeline:
Brown
Aromatics
Deglaze
Pressure / long cook
Stir in
Finish
Serve with
```

---

# 2. Three-pane builder layout

On laptop/desktop, the main working area has three columns:

```text
Column 1: Timeline / cooking steps
Column 2: Ingredients for the selected step
Column 3: Details for the selected ingredient
```

Top and bottom areas are persistent:

```text
Top: technique, cuisine, anchors, save/generate/nav
Bottom: balance summary, warnings, suggested fixes
```

Full layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Technique: Braise ▼   Cuisine: Mexican-ish ▼   Anchors: ... │
├──────────────────┬────────────────────┬─────────────────────┤
│ Timeline          │ This step           │ Ingredient detail    │
│                  │                    │                     │
│ Brown             │ Top picks           │ Rutabaga             │
│ [Oxtail]          │ [Oxtail]            │ Adds: body, sweet    │
│                  │ [Short ribs]        │ Stage: pressure      │
│ Aromatics         │                    │ Why suggested:       │
│ [Onion][Garlic]   │ Works               │ ⏱ long-cook fit      │
│                  │ [Mushrooms]         │ ⚖ balance fit        │
│ Deglaze           │ [Carrot]            │ 🍽 cuisine fit       │
│ [Red wine]        │                    │                     │
│                  │ Fallback            │ [Add to Pressure]    │
│ Pressure   ←      │ [Red lentils ⚠]     │                     │
│ [Barley][Roots]   │ [Spinach: later]    │                     │
│                  │                    │                     │
│ Finish            │                    │                     │
│ [+ Lemon]         │                    │                     │
├─────────────────────────────────────────────────────────────┤
│ Body high · Freshness low · Brightness low                   │
│ Try: [Lemon] [Green onions] [Parsley] [Thin with stock]      │
└─────────────────────────────────────────────────────────────┘
```

The interaction chain is:

```text
Select step → see ranked ingredients for that step → inspect ingredient → add it
```

---

# 3. Mobile layout

On mobile, the same three-pane model becomes a tabbed or swipeable flow:

```text
Top:
Technique / cuisine / anchors

Middle:
[Timeline] [Step] [Detail]

Bottom:
Balance summary / warnings / suggested fixes
```

Example:

```text
┌──────────────────────────────┐
│ Braise · Mexican-ish          │
│ Anchors: Oxtail, barley       │
├──────────────────────────────┤
│ [Timeline] [Step] [Detail]    │
├──────────────────────────────┤
│ active panel                  │
├──────────────────────────────┤
│ Body high · Brightness low    │
│ [Lemon] [Green onion]         │
└──────────────────────────────┘
```

The goal is to avoid the current problem: scrolling past library, detail, timeline, balance, etc. The user should always know where they are.

---

# 4. Timeline pane

The timeline is the main navigation object.

It is created by the selected technique.

For **braise/stew**:

```text
Brown
Aromatics
Deglaze
Long cook / pressure
Stir in
Finish
Serve with
```

For **curry**:

```text
Bloom spices / paste
Aromatics
Main ingredients
Simmer / pressure
Late additions
Finish
Serve with
```

For **pasta**:

```text
Sauce base
Aromatics
Main ingredient
Deglaze / liquid
Pasta
Emulsify / finish
Garnish
```

For **hand pies / pirozhki**:

```text
Prepare filling
Reduce / dry
Brighten / season
Chill
Fill
Bake / fry
Serve with
```

Each step shows selected ingredient chips:

```text
Brown
[Oxtail]

Aromatics
[Onion] [Garlic] [Tomato paste]

Pressure
[Barley] [Rutabaga] [Chickpeas]

Stir in
[Spinach]

Finish
[+ Lemon] [+ Green onions]
```

Selecting a step drives the second column.

---

# 5. Step ingredient picker

The second column shows ingredients valid for the selected step.

The list is not alphabetical and not category-first. It is ranked by usefulness in the current build.

Each step’s ingredient list is grouped into buckets:

```text
Top picks
Works
Fallback
Wrong step / add later
```

Example for `Pressure` in an oxtail/barley stew:

```text
Top picks
Rutabaga        ⏱⚖
Dried chickpeas ⏱🍽
Chipotle        🍽⚖
Celery root     ⏱

Works
Carrot          ⏱
Potato          ⏱⚠
Mushrooms       🍽

Fallback / caution
Red lentils     ⚠ dissolves
Spinach         ⚠ add later
Miso            ⚠ finish instead
```

Each row allows:

```text
Add to step
Open detail card
```

The “best” options should show why they are good.

Reason icons:

```text
🍽 cuisine fit
⚖ balance fit
⏱ cooking-time fit
⚠ caution
```

Example:

```text
Lime      🍽⚖
Rutabaga  ⏱⚖
Chipotle  🍽⚖
Spinach   ⚠ add later
```

---

# 6. Ingredient detail pane

The third column explains the selected ingredient in the context of the current build.

It should not just show raw metadata. It should explain why the ingredient appears here.

Example:

```text
Rutabaga

Why it appears here:
⏱ Survives long pressure cooking
⚖ Adds body and sweetness
🍽 Works with French-ish / northern stew profiles

Caution:
You already have barley, so this will make the stew thicker.

Best stage:
Pressure

Good with:
Oxtail, barley, onion, carrots, parsley

[Add to Pressure]
```

For a finisher:

```text
Lemon

Why it appears here:
⚖ Fixes low brightness
⚖ Cuts richness from oxtail
⏱ Finish only; do not pressure cook

Good with:
Barley, chickpeas, greens, oxtail, herbs

[Add to Finish]
```

---

# 7. Balance panel

Balance is global and persistent, preferably at the bottom.

It should be actionable by default and expandable into detail.

Compact state:

```text
Body high · Freshness low · Brightness low
Try: [Lemon] [Green onions] [Parsley]
```

Expanded state:

```text
Body              High
Richness          Medium-high
Umami             Medium
Sweetness         High
Acidity           Low
Heat              Low
Smoke             Medium
Freshness         Low
Texture           Low
Aromatic intensity High
```

The balance panel should translate scores into cooking language.

Bad:

```text
Body score: 14
Freshness score: 1
```

Good:

```text
This may become thick and heavy.
Caused by: oxtail, barley, chickpeas, sweet potato.
Try: lemon, vinegar, green onions, parsley.
```

The panel should also respond to the selected step. If the user is in `Pressure`, it should not imply lemon belongs there:

```text
Brightness is low. Add lemon at Finish.
```

---

# 8. Suggestion logic

Each ingredient suggestion is scored by several dimensions:

```text
technique step fit
+ cuisine fit
+ balance fit
+ cooking-time compatibility
+ pairing with selected ingredients
- redundancy penalty
- conflict penalty
- wrong-step penalty
```

But the UI does not show raw scores. It shows:

```text
Top picks
Works
Fallback
Wrong step / add later
```

And reason icons:

```text
🍽 cuisine
⚖ balance
⏱ timing
⚠ caution
```

Example suggestion object:

```ts
interface Suggestion {
  ingredientId: string;
  stepId: string;
  bucket: "top_pick" | "works" | "fallback" | "wrong_step";
  reasons: SuggestionReason[];
  warnings?: string[];
  score: number;
}
```

```ts
type SuggestionReason =
  | "cuisine_fit"
  | "balance_fit"
  | "timing_fit"
  | "pairing_fit"
  | "pantry_fallback"
  | "wrong_step"
  | "redundant"
  | "conflict";
```

Example:

```json
{
  "ingredientId": "lime",
  "stepId": "finish",
  "bucket": "top_pick",
  "reasons": ["cuisine_fit", "balance_fit"],
  "warnings": [],
  "score": 0.92
}
```

---

# 9. Anchor ingredients

Anchors are the ingredients the user is organizing the dish around.

They are not necessarily the only important ingredients, but they drive the build.

Examples:

```text
oxtail
barley
mushrooms
chickpeas
chicken thighs
leftover thick stew
```

Anchor ingredients are selected after technique, and they are auto-placed into their most likely steps.

Example:

```text
Technique: Braise
Anchors: Oxtail, barley

Auto-placement:
Brown: Oxtail
Pressure: Barley
```

The user can move them manually.

Potential build model:

```ts
interface BuildIngredient {
  ingredientId: string;
  stepId?: string;
  quantity?: string;
  useMode?: "anchor" | "main" | "supporting" | "accent" | "finish";
  userNote?: string;
}
```

`useMode` matters because oxtail can be either:

```text
main protein
```

or:

```text
small amount used as stock/body builder
```

For MVP, `useMode` can be hidden or inferred.

---

# 10. Technique model

A technique owns the timeline.

```ts
interface Technique {
  id: string;
  name: string;
  steps: CookingStep[];
  compatibleCuisineStyles: string[];
  defaultBalanceTargets: Partial<Record<BalanceAxis, Range>>;
  instructionTemplate: InstructionTemplate;
}
```

```ts
interface CookingStep {
  id: string;
  name: string;
  description?: string;
  allowedCategories?: IngredientCategory[];
  preferredRoles?: Role[];
  timingMode?: "short" | "medium" | "long" | "finish" | "variable";
}
```

Example:

```ts
const braiseTechnique = {
  id: "braise",
  name: "Braise / stew",
  steps: [
    { id: "brown", name: "Brown" },
    { id: "aromatics", name: "Aromatics" },
    { id: "deglaze", name: "Deglaze" },
    { id: "long_cook", name: "Long cook / pressure" },
    { id: "stir_in", name: "Stir in" },
    { id: "finish", name: "Finish" },
    { id: "serve_with", name: "Serve with" }
  ]
};
```

---

# 11. Ingredient model

The ingredient data model remains shared across techniques.

```ts
interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  defaultStep?: string;
  compatibleSteps: string[];
  roles: Role[];
  traits?: FlavorTrait[];
  balanceScores?: Partial<Record<BalanceAxis, number>>;
  cuisines: Cuisine[];
  cookMinutes?: {
    min: number;
    max: number;
  };
  saltRisk?: "low" | "medium" | "high";
  pairsWith?: string[];
  avoidWith?: string[];
  notes?: string;
}
```

Categories:

```text
protein
aromatics
liquid
roots
vegetable
legumes
grains
greens
fat
topping
spice
```

Balance axes:

```text
body
richness
umami
sweetness
acidity
heat
smoke
freshness
texture
aromatic_intensity
```

These are internal. The UI should translate them into cooking language.

---

# 12. Visual design system

Use color coding for category recognition:

```text
Protein       dark red / brown
Aromatics     gold
Liquid        blue
Roots         orange
Vegetable     olive
Legumes       tan
Grains        wheat
Greens        green
Fat           cream/yellow
Topping       purple
Spice         red/orange
```

Use icons or labels for contribution:

```text
body
rich
umami
acid
fresh
heat
smoke
crunch
long-cook
finish
```

Ingredient chip anatomy:

```text
┌─────────────────────┐
│ Oxtail        60–90 │
│ protein · rich      │
│ BODY · UMAMI        │
└─────────────────────┘
```

Compact chip:

```text
[Oxtail · body]
[Barley · chew]
[Chipotle · smoke]
[Lemon · acid]
```

Problem chips:

```text
⚠ Very thick
⚠ Low brightness
⚠ Salt risk
✓ Good umami
✓ Strong body
```

Problem chips should be tappable and should lead to suggested fixes.

---

# 13. Generated method

After selections are made, the app generates a practical method from the timeline.

Example:

```text
1. Brown oxtail.
2. Sauté onion, garlic, carrot, and tomato paste.
3. Deglaze with red wine.
4. Add barley, chickpeas, roots, chipotle, and water.
5. Pressure cook 90 minutes.
6. Remove bones and shred meat.
7. Stir in spinach.
8. Finish with lemon and green onions.
```

The generated method is downstream of the timeline, not the main editing interface.

---

# 14. Warnings and cooking intelligence

Warnings should be concrete and actionable.

Examples:

```text
Very thick
Caused by: barley, chickpeas, red lentils, potatoes, sweet potato.
Try: thin with stock, add acid/herbs, or use as filling.

Low brightness
Try: lemon, lime, vinegar, yogurt, pickled onions.

Too rich
Caused by: oxtail, cream, cheese, chili crisp.
Try: acid, herbs, greens, less fat.

Wrong step
Miso should be added at finish, not pressure.
Spinach should be stirred in late.
Couscous should be served with or added off heat.
```

The app should also detect reuse opportunities:

```text
Very thick + cohesive:
Good candidate for pirozhki, empanadas, hand pies, pot pie, stuffed pancakes.
```

---

# 15. What this replaces

Current awkward flow:

```text
Library
Detail
Cooking timeline
Balance
Cuisine
```

Problem:

```text
The app exposes the database structure and forces scrolling.
```

New flow:

```text
Technique / cuisine / anchors
Timeline
Step-specific ranked ingredient list
Ingredient detail
Balance summary
Generated method
```

The user thinks like a cook, not like a schema editor.

---

# 16. MVP scope

Include:

```text
Technique selector
Optional cuisine selector
Anchor ingredient selector
Three-pane builder on desktop
Tabbed/swipeable panels on mobile
Technique-specific timeline
Step-specific ingredient picker
Ranked buckets: Top picks / Works / Fallback / Wrong step
Reason icons: 🍽 ⚖ ⏱ ⚠
Ingredient detail pane
Persistent bottom balance summary
Generated method
Local saved builds
Color-coded ingredient chips
```

Defer:

```text
Drag and drop
User accounts
Nutrition
Shopping lists
Recipe import
Photo recognition
Exact quantity scaling
Advanced AI generation
Advanced cuisine scoring
Game mechanics
Full card-deck mode
```

---

# 17. One-sentence product definition

The app is a **technique-first cooking workbench**: the user chooses a cooking technique, optionally picks a cuisine direction, adds anchor ingredients, then works through a technique-specific timeline where each step offers ranked ingredient suggestions based on cuisine fit, balance, cooking-time compatibility, and what has already been selected.
