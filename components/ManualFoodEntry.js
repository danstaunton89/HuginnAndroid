import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config/api';

export const ManualFoodEntryModal = ({ visible, onClose, onSuccess }) => {
  const { isDarkMode } = useTheme();

  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [grams, setGrams] = useState('100');

  // Live preview calculations
  const [previewCal, setPreviewCal] = useState(0);
  const [previewP, setPreviewP] = useState(0);
  const [previewC, setPreviewC] = useState(0);
  const [previewF, setPreviewF] = useState(0);
  const [previewFbr, setPreviewFbr] = useState(0);

  useEffect(() => {
    updatePreview();
  }, [calories, protein, carbs, fat, fiber, grams]);

  const updatePreview = () => {
    const cal = parseFloat(calories) || 0;
    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;
    const fbr = parseFloat(fiber) || 0;
    const g = parseFloat(grams) || 100;

    const multiplier = g / 100;

    setPreviewCal(Math.round(cal * multiplier));
    setPreviewP(Math.round(p * multiplier * 10) / 10);
    setPreviewC(Math.round(c * multiplier * 10) / 10);
    setPreviewF(Math.round(f * multiplier * 10) / 10);
    setPreviewFbr(Math.round(fbr * multiplier * 10) / 10);
  };

  const getMealTypeByTime = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 18) return 'snack';
    return 'dinner';
  };

  const handleSubmit = async () => {
    if (!foodName.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }

    if (!calories || !protein || !carbs || !fat) {
      Alert.alert('Error', 'Please enter all nutrition values');
      return;
    }

    try {
      const authToken = await AsyncStorage.getItem('authToken');

      // Save ingredient (per 100g)
      const ingredientResponse = await fetch(`${API_BASE_URL}/api/ingredients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: foodName.trim(),
          size: 100,
          size_unit: 'g',
          calories: parseFloat(calories),
          protein: parseFloat(protein),
          carbs: parseFloat(carbs),
          fat: parseFloat(fat),
          fiber: parseFloat(fiber) || 0
        })
      });

      if (!ingredientResponse.ok) {
        throw new Error('Failed to save ingredient');
      }

      const savedIngredient = await ingredientResponse.json();

      // Always save as a reusable meal
      const mealResponse = await fetch(`${API_BASE_URL}/api/meals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: foodName.trim(),
          ingredients: [{
            ingredient_id: savedIngredient.id,
            quantity: parseFloat(grams)
          }]
        })
      });

      if (!mealResponse.ok) {
        throw new Error('Failed to save meal');
      }

      // Log to food consumption
      const apiQuantity = parseFloat(grams) / 100;
      const logResponse = await fetch(`${API_BASE_URL}/api/food-log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingredient_id: savedIngredient.id,
          quantity: apiQuantity,
          meal_type: getMealTypeByTime()
        })
      });

      if (!logResponse.ok) {
        throw new Error('Failed to log food');
      }

      Alert.alert('Success', `${foodName} logged and saved for re-use!`);

      // Clear form
      setFoodName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setFiber('');
      setGrams('100');

      onClose();
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Manual add error:', error);
      Alert.alert('Error', 'Failed to add food');
    }
  };

  const colors = {
    background: isDarkMode ? '#1a1a1a' : '#fffaf7',
    card: isDarkMode ? '#252525' : '#FFFFFF',
    text: isDarkMode ? '#E0E0E0' : '#333333',
    textSecondary: isDarkMode ? '#B0B0B0' : '#666666',
    border: isDarkMode ? '#444' : '#ffe8de',
    orange: '#FF6B35',
    orangeLight: 'rgba(255, 107, 53, 0.1)',
    green: '#4CAF50',
    greenLight: 'rgba(76, 175, 80, 0.1)',
    inputBg: isDarkMode ? '#2a2a2a' : '#ffffff',
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: Platform.OS === 'ios' ? 34 : 20,
            maxHeight: '90%',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderBottomWidth: 2,
              borderBottomColor: colors.orange,
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.orange,
              }}>
                Add Food
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ fontSize: 28, color: colors.text }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20 }}>
              {/* Food Name */}
              <View style={{ marginTop: 20 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.orange,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Food Name
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.inputBg,
                    borderWidth: 2,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    color: colors.text,
                  }}
                  value={foodName}
                  onChangeText={setFoodName}
                  placeholder="e.g., Chicken Breast"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Nutrition per 100g */}
              <View style={{
                backgroundColor: colors.orangeLight,
                borderRadius: 10,
                padding: 16,
                marginTop: 16,
                borderWidth: 1,
                borderColor: colors.orange + '40',
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.orange,
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}>
                  Nutrition per 100g
                </Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: colors.orange,
                      marginBottom: 4,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    }}>
                      Cal
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.inputBg,
                        borderWidth: 2,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: 8,
                        fontSize: 14,
                        color: colors.text,
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                      value={calories}
                      onChangeText={setCalories}
                      keyboardType="numeric"
                      placeholder="165"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: colors.orange,
                      marginBottom: 4,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    }}>
                      P
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.inputBg,
                        borderWidth: 2,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: 8,
                        fontSize: 14,
                        color: colors.text,
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                      value={protein}
                      onChangeText={setProtein}
                      keyboardType="numeric"
                      placeholder="31"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: colors.orange,
                      marginBottom: 4,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    }}>
                      C
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.inputBg,
                        borderWidth: 2,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: 8,
                        fontSize: 14,
                        color: colors.text,
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                      value={carbs}
                      onChangeText={setCarbs}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: colors.orange,
                      marginBottom: 4,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    }}>
                      F
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.inputBg,
                        borderWidth: 2,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: 8,
                        fontSize: 14,
                        color: colors.text,
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                      value={fat}
                      onChangeText={setFat}
                      keyboardType="numeric"
                      placeholder="3.6"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: colors.orange,
                      marginBottom: 4,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    }}>
                      Fbr
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.inputBg,
                        borderWidth: 2,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: 8,
                        fontSize: 14,
                        color: colors.text,
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                      value={fiber}
                      onChangeText={setFiber}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              {/* Amount Consumed */}
              <View style={{
                backgroundColor: colors.greenLight,
                borderRadius: 10,
                padding: 16,
                marginTop: 16,
                borderWidth: 1,
                borderColor: colors.green + '40',
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.green,
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}>
                  Amount Consumed
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <TextInput
                    style={{
                      backgroundColor: colors.inputBg,
                      borderWidth: 2,
                      borderColor: colors.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 18,
                      color: colors.text,
                      textAlign: 'center',
                      fontWeight: '600',
                      minWidth: 100,
                    }}
                    value={grams}
                    onChangeText={setGrams}
                    keyboardType="numeric"
                    placeholder="100"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.green,
                  }}>
                    grams
                  </Text>
                </View>
              </View>

              {/* Preview */}
              <View style={{
                backgroundColor: colors.green,
                borderRadius: 10,
                padding: 16,
                marginTop: 16,
                alignItems: 'center',
                shadowColor: colors.green,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}>
                <Text style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}>
                  Total Nutrition
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#ffffff',
                  textAlign: 'center',
                }}>
                  {previewCal} cal • {previewP}g P • {previewC}g C • {previewF}g F • {previewFbr}g Fbr
                </Text>
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#f1f3f5',
                    borderRadius: 8,
                    padding: 16,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#dee2e6',
                  }}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#495057',
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: colors.green,
                    borderRadius: 8,
                    padding: 16,
                    alignItems: 'center',
                    shadowColor: colors.green,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                  onPress={handleSubmit}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#ffffff',
                  }}>
                    Log Food
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
