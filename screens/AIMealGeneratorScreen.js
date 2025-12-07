import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function AIMealGeneratorScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  // Preferences state
  const [preferences, setPreferences] = useState({
    calories: 500,
    proteinGrams: 30,
    fatGrams: 15,
    carbGrams: 50,
    mealType: 'any',
    dietary: 'any',
    cuisine: 'any',
    excludeUltraProcessed: false,
    highOmega3: false,
    highPrebiotics: false,
    customInstructions: ''
  });

  const [loading, setLoading] = useState(false);
  const [generatedMeal, setGeneratedMeal] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerOptions, setPickerOptions] = useState([]);
  const [pickerTitle, setPickerTitle] = useState('');
  const [pickerField, setPickerField] = useState('');

  const generateMeal = async () => {
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('authToken');

      // Map mobile app field names to backend API field names
      const apiPayload = {
        targetCalories: preferences.calories,  // Backend expects targetCalories
        proteinGrams: preferences.proteinGrams,
        fatGrams: preferences.fatGrams,
        carbGrams: preferences.carbGrams,
        mealType: preferences.mealType,
        dietary: preferences.dietary,
        cuisine: preferences.cuisine,
        excludeUltraProcessed: preferences.excludeUltraProcessed,
        highOmega3: preferences.highOmega3,
        highPrebiotics: preferences.highPrebiotics,
        customInstructions: preferences.customInstructions
      };

      const response = await fetch(`${API_BASE_URL}/api/ai/generate-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.details || data.error || 'Failed to generate meal';

        // Provide helpful error messages
        if (errorMessage.includes('not configured') || errorMessage.includes('not available')) {
          errorMessage = 'AI meal service is not available. Please contact support.';
        }

        throw new Error(errorMessage);
      }

      setGeneratedMeal(data.meal);
      setShowResults(true);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to generate meal');
    } finally {
      setLoading(false);
    }
  };

  const saveMeal = async () => {
    if (!generatedMeal) return;

    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/api/ai/save-generated-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ meal: generatedMeal })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to save meal');
      }

      Alert.alert('Success', 'Meal saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save meal');
    }
  };

  const backToPreferences = () => {
    setShowResults(false);
    setGeneratedMeal(null);
  };

  const openPicker = (field, title, options) => {
    setPickerField(field);
    setPickerTitle(title);
    setPickerOptions(options);
    setPickerVisible(true);
  };

  const selectOption = (value) => {
    setPreferences({...preferences, [pickerField]: value});
    setPickerVisible(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, isDarkMode && styles.textDark]}>
            Creating your perfect meal...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showResults && generatedMeal) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.headerDark]}>
          <TouchableOpacity onPress={backToPreferences} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Generated Meal</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Meal Name & Description */}
          <View style={styles.resultCard}>
            <Text style={[styles.mealName, isDarkMode && styles.textDark]}>
              {generatedMeal.name}
            </Text>
            <Text style={[styles.mealDescription, isDarkMode && styles.textSecondaryDark]}>
              {generatedMeal.description}
            </Text>
          </View>

          {/* Nutrition Summary */}
          <View style={styles.resultCard}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Nutrition</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{Math.round(generatedMeal.totalNutrition.calories)}</Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{Math.round(generatedMeal.totalNutrition.protein)}g</Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{Math.round(generatedMeal.totalNutrition.carbs)}g</Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{Math.round(generatedMeal.totalNutrition.fat)}g</Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.resultCard}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Ingredients</Text>
            {generatedMeal.ingredients.map((ing, index) => (
              <Text key={index} style={[styles.ingredientText, isDarkMode && styles.textDark]}>
                • {ing.amount}g {ing.name}
              </Text>
            ))}
          </View>

          {/* Instructions */}
          <View style={styles.resultCard}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Instructions</Text>
            {generatedMeal.instructions.map((step, index) => (
              <Text key={index} style={[styles.instructionText, isDarkMode && styles.textDark]}>
                {index + 1}. {step}
              </Text>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={backToPreferences}
            >
              <Text style={styles.secondaryButtonText}>🔄 Generate Another</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={saveMeal}
            >
              <Text style={styles.primaryButtonText}>💾 Save Meal</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>AI Meal Generator</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calories */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>Calories</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.incrementButton}
              onPress={() => setPreferences({...preferences, calories: Math.max(200, preferences.calories - 50)})}
            >
              <Text style={styles.incrementButtonText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.numberInput, isDarkMode && styles.numberInputDark]}
              value={String(preferences.calories)}
              onChangeText={(text) => {
                if (text === '') {
                  setPreferences({...preferences, calories: 200});
                  return;
                }
                const num = parseInt(text, 10);
                if (!isNaN(num)) {
                  setPreferences({...preferences, calories: Math.min(1200, Math.max(200, num))});
                }
              }}
              keyboardType="number-pad"
              maxLength={4}
            />
            <TouchableOpacity
              style={styles.incrementButton}
              onPress={() => setPreferences({...preferences, calories: Math.min(1200, preferences.calories + 50)})}
            >
              <Text style={styles.incrementButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.rangeText, isDarkMode && styles.textSecondaryDark]}>200 - 1200 cal</Text>
        </View>

        {/* Protein */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>Protein</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.incrementButton}
              onPress={() => setPreferences({...preferences, proteinGrams: Math.max(10, preferences.proteinGrams - 5)})}
            >
              <Text style={styles.incrementButtonText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.numberInput, isDarkMode && styles.numberInputDark]}
              value={String(preferences.proteinGrams)}
              onChangeText={(text) => {
                if (text === '') {
                  setPreferences({...preferences, proteinGrams: 10});
                  return;
                }
                const num = parseInt(text, 10);
                if (!isNaN(num)) {
                  setPreferences({...preferences, proteinGrams: Math.min(100, Math.max(10, num))});
                }
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
            <TouchableOpacity
              style={styles.incrementButton}
              onPress={() => setPreferences({...preferences, proteinGrams: Math.min(100, preferences.proteinGrams + 5)})}
            >
              <Text style={styles.incrementButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.rangeText, isDarkMode && styles.textSecondaryDark]}>10 - 100g</Text>
        </View>

        {/* Fat */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>Fat</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.incrementButton}
              onPress={() => setPreferences({...preferences, fatGrams: Math.max(5, preferences.fatGrams - 5)})}
            >
              <Text style={styles.incrementButtonText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.numberInput, isDarkMode && styles.numberInputDark]}
              value={String(preferences.fatGrams)}
              onChangeText={(text) => {
                if (text === '') {
                  setPreferences({...preferences, fatGrams: 5});
                  return;
                }
                const num = parseInt(text, 10);
                if (!isNaN(num)) {
                  setPreferences({...preferences, fatGrams: Math.min(80, Math.max(5, num))});
                }
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
            <TouchableOpacity
              style={styles.incrementButton}
              onPress={() => setPreferences({...preferences, fatGrams: Math.min(80, preferences.fatGrams + 5)})}
            >
              <Text style={styles.incrementButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.rangeText, isDarkMode && styles.textSecondaryDark]}>5 - 80g</Text>
        </View>

        {/* Carbs */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>Carbs</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.incrementButton}
              onPress={() => setPreferences({...preferences, carbGrams: Math.max(10, preferences.carbGrams - 5)})}
            >
              <Text style={styles.incrementButtonText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.numberInput, isDarkMode && styles.numberInputDark]}
              value={String(preferences.carbGrams)}
              onChangeText={(text) => {
                if (text === '') {
                  setPreferences({...preferences, carbGrams: 10});
                  return;
                }
                const num = parseInt(text, 10);
                if (!isNaN(num)) {
                  setPreferences({...preferences, carbGrams: Math.min(150, Math.max(10, num))});
                }
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
            <TouchableOpacity
              style={styles.incrementButton}
              onPress={() => setPreferences({...preferences, carbGrams: Math.min(150, preferences.carbGrams + 5)})}
            >
              <Text style={styles.incrementButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.rangeText, isDarkMode && styles.textSecondaryDark]}>10 - 150g</Text>
        </View>

        {/* Dropdowns - Compact Row Layout */}
        <View style={styles.dropdownRow}>
          <View style={styles.dropdownHalf}>
            <Text style={[styles.smallLabel, isDarkMode && styles.textDark]}>Meal Type</Text>
            <View style={[styles.pickerContainer, isDarkMode && styles.pickerContainerDark]}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => openPicker('mealType', 'Meal Type', [
                  { label: 'Any', value: 'any' },
                  { label: 'Breakfast', value: 'breakfast' },
                  { label: 'Lunch', value: 'lunch' },
                  { label: 'Dinner', value: 'dinner' },
                  { label: 'Snack', value: 'snack' }
                ])}
              >
                <Text style={[styles.pickerText, isDarkMode && styles.textDark]}>
                  {preferences.mealType.charAt(0).toUpperCase() + preferences.mealType.slice(1)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dropdownHalf}>
            <Text style={[styles.smallLabel, isDarkMode && styles.textDark]}>Dietary</Text>
            <View style={[styles.pickerContainer, isDarkMode && styles.pickerContainerDark]}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => openPicker('dietary', 'Dietary Preference', [
                  { label: 'Any', value: 'any' },
                  { label: 'Vegetarian', value: 'vegetarian' },
                  { label: 'Vegan', value: 'vegan' }
                ])}
              >
                <Text style={[styles.pickerText, isDarkMode && styles.textDark]}>
                  {preferences.dietary.charAt(0).toUpperCase() + preferences.dietary.slice(1)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Cuisine Dropdown - Full Width */}
        <View style={styles.formGroup}>
          <Text style={[styles.smallLabel, isDarkMode && styles.textDark]}>Cuisine (optional)</Text>
          <View style={[styles.pickerContainer, isDarkMode && styles.pickerContainerDark]}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => openPicker('cuisine', 'Cuisine Style', [
                { label: 'Any', value: 'any' },
                { label: 'Italian', value: 'italian' },
                { label: 'Asian', value: 'asian' },
                { label: 'Mexican', value: 'mexican' },
                { label: 'American', value: 'american' },
                { label: 'Mediterranean', value: 'mediterranean' },
                { label: 'Indian', value: 'indian' },
                { label: 'French', value: 'french' },
                { label: 'Thai', value: 'thai' },
                { label: 'Japanese', value: 'japanese' },
                { label: 'Middle Eastern', value: 'middle eastern' }
              ])}
            >
              <Text style={[styles.pickerText, isDarkMode && styles.textDark]}>
                {preferences.cuisine.charAt(0).toUpperCase() + preferences.cuisine.slice(1)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Checkboxes - Compact */}
        <View style={styles.checkboxGroup}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setPreferences({...preferences, excludeUltraProcessed: !preferences.excludeUltraProcessed})}
          >
            <View style={[styles.checkbox, preferences.excludeUltraProcessed && styles.checkboxChecked]}>
              {preferences.excludeUltraProcessed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, isDarkMode && styles.textDark]}>
              Exclude ultra-processed (NOVA 4)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setPreferences({...preferences, highOmega3: !preferences.highOmega3})}
          >
            <View style={[styles.checkbox, preferences.highOmega3 && styles.checkboxChecked]}>
              {preferences.highOmega3 && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, isDarkMode && styles.textDark]}>
              High in Omega-3
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setPreferences({...preferences, highPrebiotics: !preferences.highPrebiotics})}
          >
            <View style={[styles.checkbox, preferences.highPrebiotics && styles.checkboxChecked]}>
              {preferences.highPrebiotics && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, isDarkMode && styles.textDark]}>
              High in Prebiotics
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Instructions */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>
            Custom Instructions (optional)
          </Text>
          <TextInput
            style={[styles.textInput, isDarkMode && styles.textInputDark]}
            placeholder="e.g., 'Make it spicy', 'Kid-friendly', 'Low sodium'"
            placeholderTextColor={COLORS.text.secondary}
            multiline
            numberOfLines={3}
            value={preferences.customInstructions}
            onChangeText={(text) => setPreferences({...preferences, customInstructions: text})}
          />
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateMeal}
          disabled={loading}
        >
          <Text style={styles.generateButtonText}>✨ Generate Meal</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Custom Picker Modal */}
      {pickerVisible && (
        <Modal
          visible={pickerVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setPickerVisible(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>{pickerTitle}</Text>
                  <TouchableOpacity onPress={() => setPickerVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={pickerOptions}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalOption,
                        preferences[pickerField] === item.value && styles.modalOptionSelected
                      ]}
                      onPress={() => selectOption(item.value)}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        isDarkMode && styles.textDark,
                        preferences[pickerField] === item.value && styles.modalOptionTextSelected
                      ]}>
                        {item.label}
                      </Text>
                      {preferences[pickerField] === item.value && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  containerDark: {
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerDark: {
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    color: COLORS.accent.primary,
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 10,
  },
  smallLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  incrementButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incrementButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  numberInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  numberInputDark: {
    backgroundColor: COLORS.background.tertiary,
    borderColor: COLORS.border,
  },
  rangeText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 6,
    textAlign: 'center',
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  dropdownHalf: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.background.secondary,
  },
  pickerContainerDark: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background.secondary,
  },
  pickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  checkboxGroup: {
    marginTop: 16,
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent.primary,
    borderColor: COLORS.accent.primary,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text.primary,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.secondary,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  textInputDark: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background.secondary,
    color: COLORS.text.primary,
  },
  generateButton: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  resultCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  mealName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  mealDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },
  nutritionLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  ingredientText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 20,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginBottom: 10,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.accent.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.accent.primary,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: COLORS.accent.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  textDark: {
    color: COLORS.text.primary,
  },
  textSecondaryDark: {
    color: COLORS.text.secondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalContentDark: {
    backgroundColor: COLORS.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.text.secondary,
    fontWeight: '300',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.background.tertiary,
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  modalOptionTextSelected: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
});
