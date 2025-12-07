import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function ManualIngredientScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const { returnScreen, context, initialData = {} } = route.params || {};

  const [formData, setFormData] = useState({
    name: initialData.name || '',
    size: initialData.size || '100',
    size_unit: initialData.size_unit || 'g',
    calories: initialData.calories || '',
    protein: initialData.protein || '',
    carbs: initialData.carbs || '',
    fat: initialData.fat || '',
    fiber: initialData.fiber || '',
    sugar: initialData.sugar || '',
    sodium: initialData.sodium || '',
    nova_score: initialData.nova_score || '',
    barcode: initialData.barcode || '',
    data_source: initialData.data_source || 'manual',
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter an ingredient name');
      return;
    }

    if (!formData.calories) {
      Alert.alert('Error', 'Please enter calories');
      return;
    }

    try {
      // Convert numeric fields
      const data = {
        ...formData,
        size: parseFloat(formData.size) || 100,
        calories: parseFloat(formData.calories) || 0,
        protein: parseFloat(formData.protein) || 0,
        carbs: parseFloat(formData.carbs) || 0,
        fat: parseFloat(formData.fat) || 0,
        fiber: parseFloat(formData.fiber) || 0,
        sugar: parseFloat(formData.sugar) || 0,
        sodium: parseFloat(formData.sodium) || 0,
      };

      // Save to backend API
      const authToken = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/api/ingredients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save ingredient');
      }

      const result = await response.json();
      const action = context === 'meal' ? 'Added to meal' : 'Ingredient saved';
      Alert.alert('Success', `${action}: ${data.name}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to save ingredient: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manual Entry</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
        {/* Ingredient Name */}
        <Text style={styles.label}>INGREDIENT NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Chicken Breast"
          placeholderTextColor={COLORS.text.tertiary}
          value={formData.name}
          onChangeText={(value) => updateField('name', value)}
        />

        {/* Serving Size */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>SERVING SIZE</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor={COLORS.text.tertiary}
              value={formData.size}
              onChangeText={(value) => updateField('size', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>UNIT</Text>
            <View style={styles.picker}>
              <Text style={styles.pickerText}>{formData.size_unit}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Nutrition Information (per serving)</Text>

        {/* Calories & Fat */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>CALORIES</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.text.tertiary}
              value={formData.calories}
              onChangeText={(value) => updateField('calories', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>FAT (G)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.text.tertiary}
              value={formData.fat}
              onChangeText={(value) => updateField('fat', value)}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Carbs & Sugar */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>CARBS (G)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.text.tertiary}
              value={formData.carbs}
              onChangeText={(value) => updateField('carbs', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>SUGAR (G)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.text.tertiary}
              value={formData.sugar}
              onChangeText={(value) => updateField('sugar', value)}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Fiber & Protein */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>FIBER (G)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.text.tertiary}
              value={formData.fiber}
              onChangeText={(value) => updateField('fiber', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>PROTEIN (G)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.text.tertiary}
              value={formData.protein}
              onChangeText={(value) => updateField('protein', value)}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Sodium */}
        <Text style={styles.label}>SODIUM (MG)</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={COLORS.text.tertiary}
          value={formData.sodium}
          onChangeText={(value) => updateField('sodium', value)}
          keyboardType="numeric"
        />
      </ScrollView>

      {/* Bottom Buttons - Fixed outside ScrollView */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Ingredient</Text>
        </TouchableOpacity>
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
    paddingTop: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 16,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  picker: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 30,
    marginBottom: 10,
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
});