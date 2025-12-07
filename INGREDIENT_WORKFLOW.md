# Ingredient Workflow Documentation

This document describes the ingredient management workflow in the HealthTracker mobile app, which mirrors the main web app functionality.

## Overview

The ingredient workflow consists of two main screens:
1. **Search Interface** - Initial view for finding or adding ingredients
2. **Manual Form** - Detailed nutrition entry form

## User Flows

### 1. Adding Ingredient via Scanning

```
Meals Tab → Add Ingredient → Search Interface → Scan Button
  → Barcode Scanner → Scan Product
  → Manual Form (pre-populated with scanned data)
  → Save Ingredient → Back to Ingredients List
```

**What happens:**
- User scans a barcode using the camera
- App queries OpenFoodFacts API via `/api/openfoodfacts/product/{barcode}`
- Product data is fetched and parsed
- **No quantity selector** - goes directly to manual form
- All fields pre-populated: name, serving size, unit, nutrition data
- User can edit any field before saving
- On save, navigates back to Meals screen (Ingredients tab)

### 2. Adding Ingredient Manually

```
Meals Tab → Add Ingredient → Search Interface → Manual Button
  → Manual Form (empty fields)
  → Enter all data manually
  → Save Ingredient → Back to Ingredients List
```

**What happens:**
- User clicks "Manual" button
- Manual form appears with default values (100g serving)
- User enters all ingredient information
- On save, navigates back to Meals screen (Ingredients tab)

### 3. Editing Ingredient

```
Ingredients Tab → Select Ingredient → Edit Button
  → Manual Form (pre-populated with existing data)
  → Modify fields
  → Update Ingredient → Back to Ingredients List
```

**What happens:**
- Loads existing ingredient data via `/api/ingredients/{id}`
- Manual form appears with all current values
- User modifies any fields
- PUT request updates the ingredient
- No confirmation message shown

### 4. Deleting Ingredient

```
Ingredients Tab → Select Ingredient → Delete Button
  → Confirmation Dialog
  → Delete → Back to Ingredients List
```

**What happens:**
- Confirmation dialog asks for confirmation
- DELETE request to `/api/ingredients/{id}`
- List refreshes automatically
- No success message shown

## Screen Components

### AddIngredientScreen

**Two Views:**

#### Search Interface View (`showManualForm = false`)
- Search input field
- Three action buttons: Scan, AI (disabled), Manual
- Cancel button
- **No nutrition fields visible**

#### Manual Form View (`showManualForm = true`)
- Ingredient name input
- Serving size input (numeric)
- Unit display (read-only, default: g)
- Nutrition fields:
  - Calories (required)
  - Protein (g)
  - Carbs (g)
  - Fat (g)
  - Fiber (g)
  - Sugar (g)
  - Sodium (mg)
- Cancel and Save buttons

### BarcodeScannerScreen

**Functionality:**
- Uses `expo-camera` for camera access
- Scans multiple barcode formats (EAN13, EAN8, UPC-A, etc.)
- Context-aware navigation:
  - `context === 'meal'`: Navigate to QuantitySelector (for meal builder)
  - `context === 'ingredient'`: Navigate directly to AddIngredient with scanned data
- Handles product not found scenarios
- Manual barcode entry fallback

### QuantitySelectorScreen

**Purpose:** Used ONLY for meal context, NOT for ingredients

When scanning for ingredients, this screen is bypassed entirely.

## Data Flow

### Scanning Workflow

```
BarcodeScannerScreen
  ↓ (scans barcode: 5016887003152)
  ↓ (API call: GET /api/openfoodfacts/product/5016887003152)
  ↓ (response: product data)
  ↓
AddIngredientScreen
  ↓ (showManualForm = true, scannedData populated)
  ↓ (user reviews/edits data)
  ↓ (clicks Save Ingredient)
  ↓ (POST /api/ingredients)
  ↓
MealsScreen (Ingredients tab)
  ↓ (refresh: true, newIngredient: {id})
  ↓ (highlights newly added ingredient with animation)
```

### Manual Entry Workflow

```
AddIngredientScreen (Search Interface)
  ↓ (user clicks Manual button)
  ↓ (showManualForm = true)
  ↓
AddIngredientScreen (Manual Form)
  ↓ (empty fields with defaults)
  ↓ (user enters all data)
  ↓ (clicks Save Ingredient)
  ↓ (POST /api/ingredients)
  ↓
MealsScreen (Ingredients tab)
  ↓ (refresh: true, newIngredient: {id})
```

## API Endpoints Used

### GET /api/openfoodfacts/product/:barcode
Fetches product data from OpenFoodFacts database
- Returns: Product name, brand, nutrition per 100g, barcode
- Used by: BarcodeScannerScreen

### GET /api/ingredients
Fetches user's ingredient list
- Returns: Array of ingredients with nutrition data
- Used by: MealsScreen

### GET /api/ingredients/:id
Fetches single ingredient details
- Returns: Complete ingredient data
- Used by: MealsScreen (for editing)

### POST /api/ingredients
Creates new ingredient
- Body: name, size, size_unit, calories, protein, carbs, fat, fiber, sugar, sodium, barcode, source
- Returns: Created ingredient with id
- Used by: AddIngredientScreen

### PUT /api/ingredients/:id
Updates existing ingredient
- Body: Same as POST
- Returns: Updated ingredient
- Used by: AddIngredientScreen (edit mode)

### DELETE /api/ingredients/:id
Deletes ingredient
- Returns: Success message
- Used by: MealsScreen

## State Management

### AddIngredientScreen State

```javascript
// Navigation params
editMode: boolean           // true if editing existing ingredient
ingredientData: object      // existing ingredient data (edit mode)
scannedData: object        // scanned product data (scan mode)

// Form state
showManualForm: boolean    // toggle between search and manual views
ingredientName: string
servingSize: string
servingUnit: string        // default: 'g'
calories: string
protein: string
carbs: string
fat: string
fiber: string
sugar: string
sodium: string
```

### Navigation Flow

```javascript
// From Meals screen to Add Ingredient
navigation.navigate('AddIngredient')
// Shows search interface

// From Barcode Scanner with scanned data
navigation.navigate('AddIngredient', {
  scannedData: {
    name: 'Product Name',
    size: 100,
    size_unit: 'g',
    calories: 605,
    protein: 33,
    // ... other nutrition
    barcode: '5016887003152',
    source: 'openfoodfacts'
  }
})
// Shows manual form with data populated

// From Meals screen to Edit
navigation.navigate('AddIngredient', {
  editMode: true,
  ingredientData: { /* full ingredient */ }
})
// Shows manual form with existing data
```

## UI/UX Patterns

### No Confirmation Messages
- After saving ingredient (new or edit): Silent success, navigate back
- After deleting ingredient: Silent success, refresh list
- Only show alerts for errors

### Highlight Animation
When a new ingredient is added, it briefly highlights with:
- Background color fade: #1E1E1E → #2A2A2A → #1E1E1E
- Border color fade: #333333 → #4A90E2 → #333333
- Duration: 300ms fade in, 2000ms fade out

### Form Validation
- Ingredient name: Required, cannot be empty or whitespace
- At least one nutrition value required (calories, protein, carbs, or fat)
- Numeric fields: parseFloat with fallback to 0
- Serving size: Required, must be positive number

## Key Differences from Main App

### Similarities
✅ Two-view system (search interface → manual form)
✅ Scan button navigates to dedicated scanner
✅ Manual form has all same fields
✅ Same API endpoints and data structure
✅ No quantity selector for ingredients

### Mobile-Specific Features
📱 Native camera integration with expo-camera
📱 Touch-optimized form inputs
📱 Mobile keyboard types (numeric for numbers)
📱 React Native navigation patterns
📱 Pull-to-refresh on lists

## Common Issues & Solutions

### Issue: Scanned product not found
**Solution:** Alert offers "Enter Manually" or "Try Again"
- Manual: Navigates to form with barcode pre-filled
- Try Again: Resets scanner to scan again

### Issue: No camera permission
**Solution:** Shows error screen with manual entry option

### Issue: Product found but no nutrition data
**Solution:** Navigates to manual form with barcode and name only

### Issue: Form appears with populated data when it shouldn't
**Solution:** Check route params - ensure scannedData/ingredientData cleared

## Testing Checklist

- [ ] Scan valid barcode → Form pre-populated correctly
- [ ] Scan invalid barcode → Manual entry option appears
- [ ] Manual entry → All fields editable, saves correctly
- [ ] Edit ingredient → Loads existing data, saves changes
- [ ] Delete ingredient → Confirms, deletes, refreshes list
- [ ] Search interface → Shows/hides correctly
- [ ] Navigation back → No data persistence issues
- [ ] Highlight animation → Plays on new ingredient
- [ ] No confirmation messages on save/delete
- [ ] Error messages display for API failures

## Future Enhancements

- [ ] AI ingredient recognition (currently disabled)
- [ ] Ingredient search with autocomplete
- [ ] Barcode history/favorites
- [ ] Bulk ingredient import
- [ ] Custom unit types
- [ ] Ingredient photos
- [ ] Nutrition data verification