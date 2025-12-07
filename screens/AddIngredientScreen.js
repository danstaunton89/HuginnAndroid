import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function AddIngredientScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Check if we're in edit mode or have scanned data
  const { editMode, ingredientData, scannedData } = route.params || {};

  const [showManualForm, setShowManualForm] = useState(editMode || !!scannedData);

  // Ingredient state - populate with ingredient data if editing or scanned data
  const dataSource = ingredientData || scannedData;
  const [ingredientName, setIngredientName] = useState(dataSource?.name || '');

  const [servingSize, setServingSize] = useState(dataSource?.size?.toString() || '100');
  const [servingUnit, setServingUnit] = useState(dataSource?.size_unit || 'g');
  const [calories, setCalories] = useState(dataSource?.calories?.toString() || '');
  const [protein, setProtein] = useState(dataSource?.protein?.toString() || '');
  const [carbs, setCarbs] = useState(dataSource?.carbs?.toString() || '');
  const [fat, setFat] = useState(dataSource?.fat?.toString() || '');
  const [fiber, setFiber] = useState(dataSource?.fiber?.toString() || '');
  const [sugar, setSugar] = useState(dataSource?.sugar?.toString() || '');
  const [sodium, setSodium] = useState(dataSource?.sodium?.toString() || '');

  const handleScan = async () => {
    navigation.navigate('BarcodeScanner', {
      returnScreen: 'AddIngredient',
      context: 'ingredient'
    });
  };

  const handleManual = () => {
    setShowManualForm(true);
  };

  const handleAI = () => {
    Alert.alert('AI Recognition', 'AI ingredient recognition is coming soon!');
  };

  const handleSaveIngredient = async () => {
    // Validate ingredient name is provided
    if (!ingredientName || ingredientName.trim() === '') {
      Alert.alert('Error', 'Please enter an ingredient name');
      return;
    }

    // Validate at least one nutrition value is provided
    if (!calories && !protein && !carbs && !fat) {
      Alert.alert('Error', 'Please enter at least one nutrition value');
      return;
    }

    try {
      // Get auth token
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      // Save ingredient to API (create or update)
      const url = editMode
        ? `${API_BASE_URL}/api/ingredients/${ingredientData.id}`
        : `${API_BASE_URL}/api/ingredients`;
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: ingredientName.trim(),
          brand: scannedData?.brand || '',
          size: parseFloat(servingSize) || 100,
          size_unit: servingUnit,
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
          fiber: parseFloat(fiber) || 0,
          sugar: parseFloat(sugar) || 0,
          sodium: parseFloat(sodium) || 0,
          barcode: scannedData?.barcode || ingredientData?.barcode || null,
          source: editMode ? ingredientData.source : (scannedData ? 'openfoodfacts' : 'manual'),
          has_manual_nutrition: editMode || !!scannedData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to save ingredient: ${response.status}`);
      }

      // Success - navigate back to ingredients list
      navigation.navigate('Main', {
        screen: 'Meals',
        params: { refresh: true, newIngredient: data.id }
      });
    } catch (error) {
      Alert.alert('Error', `Failed to save ingredient: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.black} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {editMode ? 'Edit Ingredient' : (scannedData ? 'Add Scanned Ingredient' : 'Add Ingredient')}
        </Text>
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
        {!showManualForm ? (
          // Search Interface (like main app)
          <>
            {/* Search Input for existing ingredients */}
            <Text style={styles.label}>Search Ingredients</Text>
            <TextInput
              style={styles.input}
              placeholder="Search existing ingredients or type to add new..."
              placeholderTextColor={COLORS.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Add Methods Section */}
            <Text style={styles.label}>Add New Ingredient</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleScan}>
                <Text style={styles.actionButtonIcon}>📱</Text>
                <Text style={styles.actionButtonText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.disabledButton]}
                onPress={handleAI}
                disabled={true}
              >
                <Text style={[styles.actionButtonIcon, styles.disabledText]}>⭐</Text>
                <Text style={[styles.actionButtonText, styles.disabledText]}>AI</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleManual}>
                <Text style={styles.actionButtonIcon}>✏️</Text>
                <Text style={styles.actionButtonText}>Manual</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Manual Form (shown after clicking Manual or scanning)
          <>
            {/* Ingredient Name */}
            <Text style={styles.label}>Ingredient Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Chicken Breast"
              placeholderTextColor={COLORS.text.tertiary}
              value={ingredientName}
              onChangeText={setIngredientName}
            />

            {/* Serving Size and Unit */}
            <View style={styles.servingRow}>
              <View style={styles.servingGroup}>
                <Text style={styles.label}>Serving Size</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={servingSize}
                  onChangeText={setServingSize}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.servingGroup}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.input}>
                  <Text style={styles.unitText}>{servingUnit}</Text>
                </View>
              </View>
            </View>

            {/* Nutrition Information Per Serving */}
            <Text style={styles.label}>Nutrition Information (per serving)</Text>

            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Calories</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Fiber (g)</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={fiber}
                  onChangeText={setFiber}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Sugar (g)</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={sugar}
                  onChangeText={setSugar}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Sodium (mg)</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={sodium}
                  onChangeText={setSodium}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Buttons - Fixed outside ScrollView */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.navigate('Main', { screen: 'Meals' })}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        {showManualForm && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveIngredient}>
            <Text style={styles.saveButtonText}>{editMode ? 'Update Ingredient' : 'Save Ingredient'}</Text>
          </TouchableOpacity>
        )}
      </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    paddingTop: 30,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
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
  nutritionGrid: {
    marginBottom: 20,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  nutritionLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  nutritionInput: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 80,
    textAlign: 'right',
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
    backgroundColor: COLORS.accent.secondary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    marginBottom: 20,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.accent.secondary,
    fontWeight: '500',
  },
  servingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  servingGroup: {
    flex: 1,
  },
  unitText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});