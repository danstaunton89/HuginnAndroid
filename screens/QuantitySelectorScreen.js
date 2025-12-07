import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useMeal } from '../contexts/MealContext';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function QuantitySelectorScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const { addIngredient } = useMeal();
  const { product, returnScreen, context, userIngredientName } = route.params || {};

  const [quantity, setQuantity] = useState(product?.serving_size || 100);
  const [calculatedCalories, setCalculatedCalories] = useState(product?.calories || 0);
  const [calculatedProtein, setCalculatedProtein] = useState(product?.protein || 0);
  const [calculatedCarbs, setCalculatedCarbs] = useState(product?.carbs || 0);
  const [calculatedFat, setCalculatedFat] = useState(product?.fat || 0);

  const recalculateNutrition = (newQuantity) => {
    // OpenFoodFacts nutrition is always per 100g
    const multiplier = newQuantity / 100;

    setCalculatedCalories(Math.round((product?.calories || 0) * multiplier));
    setCalculatedProtein(Math.round((product?.protein || 0) * multiplier * 10) / 10);
    setCalculatedCarbs(Math.round((product?.carbs || 0) * multiplier * 10) / 10);
    setCalculatedFat(Math.round((product?.fat || 0) * multiplier * 10) / 10);
  };

  const updateQuantity = (newQuantity) => {
    setQuantity(newQuantity);
    recalculateNutrition(newQuantity);
  };

  const handleAddToMeal = async () => {
    try {
      // OpenFoodFacts nutrition is always per 100g
      const multiplier = quantity / 100;

      const ingredientData = {
        id: product?.id || Date.now(),
        name: product?.name,
        brand: product?.brand,
        quantity: quantity,
        unit: 'g',
        calories: (product?.calories || 0) * multiplier,
        protein: (product?.protein || 0) * multiplier,
        carbs: (product?.carbs || 0) * multiplier,
        fat: (product?.fat || 0) * multiplier,
        fiber: (product?.fiber || 0) * multiplier,
        sugar: (product?.sugar || 0) * multiplier,
        sodium: (product?.sodium || 0) * multiplier,
        barcode: product?.barcode,
        source: product?.source
      };

      if (context === 'dashboard') {
        // Log directly to food consumption for dashboard quick add
        try {
          const authToken = await AsyncStorage.getItem('authToken');

          // First, check if ingredient exists or import from OpenFoodFacts
          let ingredientId = product?.id;

          if (!ingredientId && product?.barcode) {
            // Import from OpenFoodFacts
            const importResponse = await fetch(`${API_BASE_URL}/api/openfoodfacts/import`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                barcode: product.barcode,
                name: product.name,
                brand: product.brand,
                serving_size: 100,  // Always 100g for OpenFoodFacts (nutrition is per 100g)
                serving_unit: 'g',
                calories: product.calories,
                protein: product.protein,
                carbs: product.carbs,
                fat: product.fat,
                fiber: product.fiber
              })
            });

            if (importResponse.ok) {
              const importData = await importResponse.json();
              ingredientId = importData.ingredient.id;
            } else if (importResponse.status === 409) {
              const errorData = await importResponse.json();
              ingredientId = errorData.existing?.id;
            }
          }

          // Log to food consumption
          const logResponse = await fetch(`${API_BASE_URL}/api/food-log`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ingredient_id: ingredientId,
              quantity: multiplier, // API expects multiplier relative to serving size
              meal_type: getMealTypeByTime()
            })
          });

          if (logResponse.ok) {
            Alert.alert(
              'Logged!',
              `${quantity}g of ${product?.name} logged to today's nutrition\n${Math.round(ingredientData.calories)} calories`,
              [
                {
                  text: 'Add Another',
                  onPress: () => navigation.navigate('BarcodeScanner', { returnScreen: 'Main', context: 'dashboard' })
                },
                {
                  text: 'Done',
                  onPress: () => navigation.navigate('Main', { screen: 'Dashboard' })
                }
              ]
            );
          } else {
            throw new Error('Failed to log food');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to log food to today\'s nutrition');
        }
      } else if (context === 'meal') {
        // Add ingredient to the current meal
        addIngredient(ingredientData);

        Alert.alert(
          'Added to Meal!',
          `Added ${quantity}g of ${product?.name}\n${Math.round(ingredientData.calories)} calories`,
          [
            {
              text: 'Add Another',
              onPress: () => navigation.navigate('BarcodeScanner', { returnScreen: 'CreateMeal', context: 'meal' })
            },
            {
              text: 'Done',
              onPress: () => {
                // Use replace to avoid navigation stack issues
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'CreateMeal' }],
                });
              }
            }
          ]
        );
      } else {
        // For ingredients context - we shouldn't be here!
        // The barcode scanner should navigate directly to AddIngredient
        Alert.alert('Error', 'Invalid navigation flow for ingredients');
      }

    } catch (error) {
      Alert.alert('Error', context === 'meal' ? 'Failed to add to meal' : 'Failed to save ingredient');
    }
  };

  const getMealTypeByTime = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 18) return 'snack';
    return 'dinner';
  };

  React.useEffect(() => {
    recalculateNutrition(quantity);
  }, []);

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>No product data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{product.name || 'Unknown Product'}</Text>
        <TouchableOpacity onPress={() => {
          if (context === 'meal') {
            navigation.reset({
              index: 0,
              routes: [{ name: 'CreateMeal' }],
            });
          } else if (context === 'dashboard') {
            navigation.navigate('Main', { screen: 'Dashboard' });
          } else {
            navigation.navigate(returnScreen || 'Main', returnScreen ? {} : { screen: 'Meals' });
          }
        }}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productDetails}>
            {product.brand ? `${product.brand} • ` : ''}
            {product.serving_size || 100}{product.serving_unit || 'g'} • {product.calories || 0} cal
          </Text>
        </View>

        {/* Quantity Section */}
        <Text style={styles.sectionLabel}>How much are you having?</Text>

        <View style={styles.quantityRow}>
          <TextInput
            style={styles.quantityInput}
            value={quantity.toString()}
            onChangeText={(value) => {
              const newQty = parseFloat(value) || 0;
              updateQuantity(newQty);
            }}
            keyboardType="numeric"
            selectTextOnFocus={true}
          />
          <Text style={styles.unitText}>g</Text>
        </View>

        {/* Quick Quantity Buttons */}
        <View style={styles.quickButtons}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => updateQuantity(50)}
          >
            <Text style={styles.quickButtonText}>50g</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => updateQuantity(100)}
          >
            <Text style={styles.quickButtonText}>100g</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => updateQuantity(150)}
          >
            <Text style={styles.quickButtonText}>150g</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => updateQuantity(200)}
          >
            <Text style={styles.quickButtonText}>200g</Text>
          </TouchableOpacity>
        </View>

        {/* Nutrition Preview */}
        <View style={styles.nutritionPreview}>
          <Text style={styles.previewLabel}>For {quantity}g:</Text>
          <Text style={styles.previewText}>
            {calculatedCalories} cal • {calculatedProtein}g protein • {calculatedCarbs}g carbs • {calculatedFat}g fat
          </Text>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            if (context === 'meal') {
              navigation.reset({
                index: 0,
                routes: [{ name: 'CreateMeal' }],
              });
            } else if (context === 'dashboard') {
              navigation.navigate('Main', { screen: 'Dashboard' });
            } else {
              navigation.navigate(returnScreen || 'Main', returnScreen ? {} : { screen: 'Meals' });
            }
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddToMeal}
        >
          <Text style={styles.addButtonText}>
            {context === 'meal' ? 'Add to Meal' : context === 'dashboard' ? 'Log Food' : 'Save Ingredient'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 20,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  productInfo: {
    marginBottom: 30,
  },
  productDetails: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 15,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  quantityInput: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: '#333333',
    textAlign: 'center',
    minWidth: 120,
    marginRight: 10,
  },
  unitText: {
    fontSize: 18,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  quickButton: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  quickButtonText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  nutritionPreview: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 5,
  },
  previewText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  addButton: {
    flex: 1,
    backgroundColor: COLORS.accent.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
});