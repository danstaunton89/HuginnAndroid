import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, TextInput, Alert, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useMeal } from '../contexts/MealContext';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function CreateMealScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const { currentMeal, updateMealName, updateServings, updateIngredient, removeIngredient, resetMeal, loadMeal } = useMeal();

  // Edit ingredient modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIngredientIndex, setEditingIngredientIndex] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');

  // Check if we're in edit mode
  const { editMode, mealData } = route.params || {};
  const isEditing = editMode && mealData;

  // Load existing meal data or reset on mount
  useEffect(() => {
    if (isEditing) {
      // Load existing meal data for editing
      loadMeal(mealData);
    } else if (!currentMeal.name && currentMeal.ingredients.length === 0) {
      // Reset meal only for new meals
      resetMeal();
    }
  }, [isEditing]); // Depend on edit mode

  const handleScan = async () => {
    navigation.navigate('BarcodeScanner', {
      returnScreen: 'CreateMeal',
      context: 'meal'
    });
  };

  const handleManual = () => {
    navigation.navigate('ManualIngredient', {
      returnScreen: 'CreateMeal',
      context: 'meal'
    });
  };

  const handleAI = () => {
    Alert.alert('AI Recognition', 'AI ingredient recognition is coming soon!');
  };

  const handleEditIngredient = (index) => {
    const ingredient = currentMeal.ingredients[index];
    setEditingIngredientIndex(index);
    setEditQuantity(ingredient.quantity.toString());
    setShowEditModal(true);
  };

  const handleSaveEditedIngredient = () => {
    const ingredient = currentMeal.ingredients[editingIngredientIndex];
    const quantity = parseFloat(editQuantity);

    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    // Calculate new nutrition values based on new quantity
    const baseNutrition = {
      calories: ingredient.calories / ingredient.quantity,
      protein: ingredient.protein / ingredient.quantity,
      carbs: ingredient.carbs / ingredient.quantity,
      fat: ingredient.fat / ingredient.quantity,
      fiber: ingredient.fiber / ingredient.quantity,
      sugar: ingredient.sugar / ingredient.quantity,
      sodium: ingredient.sodium / ingredient.quantity
    };

    const updatedIngredient = {
      ...ingredient,
      quantity: quantity,
      calories: baseNutrition.calories * quantity,
      protein: baseNutrition.protein * quantity,
      carbs: baseNutrition.carbs * quantity,
      fat: baseNutrition.fat * quantity,
      fiber: baseNutrition.fiber * quantity,
      sugar: baseNutrition.sugar * quantity,
      sodium: baseNutrition.sodium * quantity
    };

    updateIngredient(editingIngredientIndex, updatedIngredient);
    setShowEditModal(false);
    setEditingIngredientIndex(null);
    setEditQuantity('');
  };

  const handleSaveMeal = async () => {
    if (!currentMeal.name.trim()) {
      Alert.alert('Error', 'Please enter a meal name');
      return;
    }

    if (currentMeal.ingredients.length === 0) {
      Alert.alert('Error', 'Please add at least one ingredient');
      return;
    }

    try {
      // Get auth token
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      // First, create ingredients in the database and get their IDs (for new ingredients)
      const ingredientIds = [];
      for (const ingredient of currentMeal.ingredients) {
        try {
          // For existing ingredients with IDs, use them directly
          if (ingredient.ingredient_id) {
            ingredientIds.push({
              ingredient_id: ingredient.ingredient_id,
              quantity: ingredient.quantity / 100 // Convert to per-gram basis
            });
          } else {
            // Create new ingredient in database
            const ingredientResponse = await fetch(`${API_BASE_URL}/api/ingredients`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: ingredient.name,
                brand: ingredient.brand || '',
                calories: ingredient.calories,
                protein: ingredient.protein,
                carbs: ingredient.carbs,
                fat: ingredient.fat,
                fiber: ingredient.fiber || 0,
                sugar: ingredient.sugar || 0,
                sodium: ingredient.sodium || 0,
                barcode: ingredient.barcode || null,
                source: ingredient.source || 'manual'
              })
            });

            const ingredientData = await ingredientResponse.json();
            if (ingredientResponse.ok) {
              ingredientIds.push({
                ingredient_id: ingredientData.id,
                quantity: ingredient.quantity / 100 // Convert to per-gram basis
              });
            }
          }
        } catch (err) {
          }
      }

      // Prepare meal data
      const mealPayload = {
        name: currentMeal.name.trim(),
        type: 'meal',
        ingredients: ingredientIds,
        servings: currentMeal.servings,
        notes: currentMeal.notes || null
      };

      // Save meal to API with ingredient IDs
      const url = isEditing
        ? `${API_BASE_URL}/api/meals/${currentMeal.id}`
        : `${API_BASE_URL}/api/meals`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mealPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'save'} meal: ${response.status}`);
      }

      // Success - navigate back to meals list
      resetMeal();
      navigation.navigate('Main', {
        screen: 'Meals',
        params: { refresh: true, newMeal: data.id }
      });
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'save'} meal: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.black} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Meal' : 'Create New Meal'}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Meals' })}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 400 }}
        >
        {/* Meal Name */}
        <Text style={styles.label}>Meal Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Chicken Salad Bowl"
          placeholderTextColor={COLORS.text.tertiary}
          value={currentMeal.name}
          onChangeText={updateMealName}
        />

        {/* Servings */}
        <Text style={styles.label}>Servings</Text>
        <View style={styles.servingsContainer}>
          <TouchableOpacity
            style={styles.servingButton}
            onPress={() => updateServings(Math.max(1, currentMeal.servings - 1))}
          >
            <Text style={styles.servingButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.servingValue}>{currentMeal.servings}</Text>
          <TouchableOpacity
            style={styles.servingButton}
            onPress={() => updateServings(currentMeal.servings + 1)}
          >
            <Text style={styles.servingButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Add Ingredients */}
        <Text style={styles.label}>Add Ingredients</Text>
        <TextInput
          style={styles.input}
          placeholder="Search existing ingredients or type to add"
          placeholderTextColor={COLORS.text.tertiary}
        />

        <View style={styles.ingredientButtons}>
          <TouchableOpacity style={styles.ingredientButton} onPress={handleScan}>
            <Text style={styles.ingredientButtonIcon}>📱</Text>
            <Text style={styles.ingredientButtonText}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ingredientButton, styles.disabledButton]}
            onPress={handleAI}
            disabled={true}
          >
            <Text style={[styles.ingredientButtonIcon, styles.disabledText]}>⭐</Text>
            <Text style={[styles.ingredientButtonText, styles.disabledText]}>AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ingredientButton} onPress={handleManual}>
            <Text style={styles.ingredientButtonIcon}>✏️</Text>
            <Text style={styles.ingredientButtonText}>Manual</Text>
          </TouchableOpacity>
        </View>

        {/* Ingredients List */}
        {currentMeal.ingredients.length > 0 && (
          <>
            <Text style={styles.label}>Ingredients ({currentMeal.ingredients.length})</Text>
            <View style={styles.ingredientsList}>
              {currentMeal.ingredients.map((ingredient, index) => (
                <View key={ingredient.id} style={styles.ingredientItem}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientDetails}>
                      {ingredient.quantity}g • {Math.round(ingredient.calories)} cal
                    </Text>
                  </View>
                  <View style={styles.ingredientActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditIngredient(index)}
                    >
                      <Text style={styles.editButtonText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeIngredient(index)}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Nutrition Per Serving */}
        <Text style={styles.label}>Nutrition Per Serving</Text>
        <View style={styles.nutritionGrid}>
          <View style={[styles.nutritionBadge, { backgroundColor: COLORS.accent.primary }]}>
            <Text style={styles.nutritionValue}>
              {Math.round(currentMeal.totalNutrition.calories / currentMeal.servings)}
            </Text>
            <Text style={styles.nutritionLabel}>CALORIES</Text>
          </View>
          <View style={[styles.nutritionBadge, { backgroundColor: COLORS.accent.secondary }]}>
            <Text style={styles.nutritionValue}>
              {Math.round(currentMeal.totalNutrition.fat / currentMeal.servings)}g
            </Text>
            <Text style={styles.nutritionLabel}>FAT</Text>
          </View>
          <View style={[styles.nutritionBadge, { backgroundColor: COLORS.accent.tertiary }]}>
            <Text style={styles.nutritionValue}>
              {Math.round(currentMeal.totalNutrition.carbs / currentMeal.servings)}g
            </Text>
            <Text style={styles.nutritionLabel}>CARBS</Text>
          </View>
          <View style={[styles.nutritionBadge, { backgroundColor: COLORS.accent.light }]}>
            <Text style={styles.nutritionValue}>
              {Math.round(currentMeal.totalNutrition.sugar / currentMeal.servings)}g
            </Text>
            <Text style={styles.nutritionLabel}>SUGARS</Text>
          </View>
          <View style={[styles.nutritionBadge, { backgroundColor: COLORS.accent.secondary, width: '48%' }]}>
            <Text style={styles.nutritionValue}>
              {Math.round(currentMeal.totalNutrition.fiber / currentMeal.servings)}g
            </Text>
            <Text style={styles.nutritionLabel}>FIBER</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons - Fixed outside ScrollView */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            resetMeal(); // Clear the meal when canceling
            navigation.navigate('Main', { screen: 'Meals' });
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveMeal}>
          <Text style={styles.saveButtonText}>{isEditing ? 'Update Meal' : 'Save Meal'}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      {/* Edit Ingredient Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: COLORS.background.secondary,
            borderRadius: 16,
            padding: 24,
            width: '80%',
            maxWidth: 400,
          }}>
            {editingIngredientIndex !== null && currentMeal.ingredients[editingIngredientIndex] && (
              <>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  marginBottom: 8,
                }}>
                  Edit Ingredient Quantity
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: COLORS.text.secondary,
                  marginBottom: 16,
                }}>
                  {currentMeal.ingredients[editingIngredientIndex].name}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: COLORS.background.tertiary,
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    marginBottom: 20,
                  }}
                  placeholder="Quantity (grams)"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="numeric"
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  autoFocus={true}
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.border,
                      borderRadius: 8,
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setShowEditModal(false);
                      setEditingIngredientIndex(null);
                      setEditQuantity('');
                    }}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#FFFFFF',
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.accent.primary,
                      borderRadius: 8,
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                    onPress={handleSaveEditedIngredient}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#FFFFFF',
                    }}>
                      Update
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 20,
  },
  input: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  servingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  servingButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  servingValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginHorizontal: 20,
    flex: 1,
    textAlign: 'center',
  },
  ingredientButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  ingredientButton: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ingredientButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  ingredientButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: COLORS.background.tertiary,
    borderColor: '#444444',
  },
  disabledText: {
    color: COLORS.text.tertiary,
  },
  ingredientsList: {
    marginBottom: 20,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  ingredientDetails: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  ingredientActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nutritionBadge: {
    width: '48%',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nutritionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background.primary,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.accent.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});