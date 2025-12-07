import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Alert, RefreshControl, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS } from '../config/theme';
import { API_BASE_URL } from '../config/api';

const targetConfig = {
  nutrition: {
    name: 'Nutrition',
    icon: '🍎',
    targets: {
      calories: { name: 'Calories', icon: '🔥', unit: 'kcal', placeholder: '2000' },
      carbs: { name: 'Carbohydrates', icon: '🌾', unit: 'g', placeholder: '300' },
      protein: { name: 'Protein', icon: '🥩', unit: 'g', placeholder: '50' },
      fat: { name: 'Fat', icon: '🥑', unit: 'g', placeholder: '65' },
      fiber: { name: 'Fiber', icon: '🌿', unit: 'g', placeholder: '25' }
    }
  },
  vitals: {
    name: 'Vitals',
    icon: '❤️',
    targets: {
      weight: { name: 'Weight', icon: '⚖️', unit: 'kg', placeholder: '70', alternateUnits: ['kg', 'lbs', 'stone'] },
      bloodpressure: { name: 'Blood Pressure', icon: '❤️', unit: 'mmHg', placeholder: '120/80' }
    }
  },
  hydration: {
    name: 'Hydration',
    icon: '💧',
    targets: {
      water: { name: 'Water Intake', icon: '💧', unit: 'ml', placeholder: '2000' }
    }
  },
  wellbeing: {
    name: 'Well-being',
    icon: '🌟',
    targets: {
      sleep: { name: 'Sleep', icon: '😴', unit: 'hours', placeholder: '8' },
      exercise: { name: 'Exercise', icon: '🏃', unit: 'minutes', placeholder: '30' },
      steps: { name: 'Steps', icon: '👟', unit: 'steps', placeholder: '10000' },
      fasting_window: { name: 'Fasting Window', icon: '⏰', unit: 'time_range', placeholder: '20:00-12:00' }
    }
  }
};

export default function TargetsScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [activeCategory, setActiveCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userTargets, setUserTargets] = useState({});
  const [currentProgress, setCurrentProgress] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');

  // Weight goal calorie calculator states
  const [goalType, setGoalType] = useState('loss'); // loss, maintain, gain
  const [weeklyRate, setWeeklyRate] = useState(0.5); // kg/week
  const [weeklyRateUnit, setWeeklyRateUnit] = useState('kg');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [calculatedData, setCalculatedData] = useState(null);
  const [calorieGoal, setCalorieGoal] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Trigger calculation when weight goal modal opens with existing data
  useEffect(() => {
    if (showModal && selectedType === 'weight' && targetValue && editingTarget) {
      // Small delay to ensure state is set
      const timer = setTimeout(() => {
        calculateCalories(targetValue, targetUnit);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showModal, selectedType, editingTarget]);

  const loadData = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      const [targetsResponse, progressResponse, calorieResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/targets`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/api/targets/progress`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/api/calorie-goal`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      ]);

      if (targetsResponse.ok) {
        const targets = await targetsResponse.json();
        const organized = {};
        targets.forEach(target => {
          const displayType = target.target_type === 'ideal_weight' ? 'weight' : target.target_type;
          organized[displayType] = {
            value: target.target_value,
            unit: target.unit || target.target_unit || ''
          };
        });
        setUserTargets(organized);
      }

      if (progressResponse.ok) {
        const progress = await progressResponse.json();
        setCurrentProgress(progress);
      }

      if (calorieResponse.ok) {
        const calorieData = await calorieResponse.json();
        setCalorieGoal(calorieData.success ? calorieData.data : null);
      }
    } catch (error) {
      } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const findTargetInfo = (type) => {
    for (const [categoryKey, category] of Object.entries(targetConfig)) {
      if (category.targets[type]) {
        return {
          ...category.targets[type],
          category: categoryKey,
          categoryName: category.name
        };
      }
    }
    return null;
  };

  const calculateCalories = async (weightValue, weightUnit) => {
    if (!weightValue || parseFloat(weightValue) <= 0) {
      setCalculatedData(null);
      return;
    }

    try {
      // Convert to kg if needed
      let targetWeightKg = parseFloat(weightValue);
      if (weightUnit === 'lbs') {
        targetWeightKg = targetWeightKg / 2.20462;
      } else if (weightUnit === 'stone') {
        targetWeightKg = targetWeightKg * 6.35029;
      }

      // Calculate weekly change based on goal type
      let weeklyChangeKg = 0;
      if (goalType === 'loss') {
        weeklyChangeKg = -weeklyRate;
      } else if (goalType === 'gain') {
        weeklyChangeKg = weeklyRate;
      }

      const authToken = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/calorie-goal/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target_weight_kg: targetWeightKg,
          weekly_change_kg: weeklyChangeKg,
          activity_level: activityLevel,
          use_auto_detection: false
        })
      });

      const result = await response.json();
      if (result.success) {
        setCalculatedData(result.data);
      }
    } catch (error) {
      console.error('Error calculating calories:', error);
    }
  };

  const openModal = (type = null) => {
    if (type) {
      setEditingTarget(type);
      const target = userTargets[type];
      setSelectedType(type);
      setTargetValue(target.value);
      setTargetUnit(target.unit);

      // If editing weight goal, load calorie goal settings
      if (type === 'weight' && calorieGoal) {
        setActivityLevel(calorieGoal.activity_level || 'moderate');
        const weeklyChange = parseFloat(calorieGoal.weekly_loss_goal_kg || 0);
        if (Math.abs(weeklyChange) < 0.01) {
          setGoalType('maintain');
        } else if (weeklyChange > 0) {
          setGoalType('gain');
          setWeeklyRate(weeklyChange);
        } else {
          setGoalType('loss');
          setWeeklyRate(Math.abs(weeklyChange));
        }
      }
    } else {
      setEditingTarget(null);
      setSelectedType('');
      setTargetValue('');
      setTargetUnit('');
      // Reset calorie calculator
      setGoalType('loss');
      setWeeklyRate(0.5);
      setWeeklyRateUnit('kg');
      setActivityLevel('moderate');
      setCalculatedData(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTarget(null);
    setSelectedType('');
    setTargetValue('');
    setTargetUnit('');
    // Reset calorie calculator
    setGoalType('loss');
    setWeeklyRate(0.5);
    setWeeklyRateUnit('kg');
    setActivityLevel('moderate');
    setCalculatedData(null);
  };

  const saveTarget = async () => {
    // Special handling for weight goals with calorie calculator
    if (selectedType === 'weight') {
      if (!targetValue || !calculatedData) {
        Alert.alert('Error', 'Please enter a target weight to calculate your calorie goal');
        return;
      }

      try {
        const authToken = await AsyncStorage.getItem('authToken');
        if (!authToken) {
          Alert.alert('Error', 'Please log in again');
          return;
        }

        // Save weight target
        let dbValue = parseFloat(targetValue);
        if (targetUnit === 'lbs') {
          dbValue = (dbValue / 2.20462).toFixed(2);
        } else if (targetUnit === 'stone') {
          dbValue = (dbValue * 6.35029).toFixed(2);
        } else {
          dbValue = dbValue.toFixed(2);
        }

        const targetResponse = await fetch(`${API_BASE_URL}/api/targets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            target_type: 'ideal_weight',
            target_value: dbValue,
            unit: 'kg'
          })
        });

        if (!targetResponse.ok) {
          throw new Error('Failed to save weight target');
        }

        // Calculate weekly change and daily adjustment
        let weeklyChangeKg = 0;
        if (goalType === 'gain') {
          weeklyChangeKg = weeklyRate;
        } else if (goalType === 'loss') {
          weeklyChangeKg = -weeklyRate;
        }

        const dailyAdjustment = Math.round((weeklyChangeKg * 7700) / 7);

        // Save calorie goal
        const calorieResponse = await fetch(`${API_BASE_URL}/api/calorie-goal`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            target_weight_kg: parseFloat(dbValue),
            weekly_change_kg: weeklyChangeKg,
            activity_level: activityLevel,
            activity_level_source: 'manual',
            activity_confidence: 100,
            bmr: calculatedData.bmr,
            tdee: calculatedData.tdee,
            daily_adjustment: dailyAdjustment,
            target_calories: calculatedData.target_calories,
            weeks_to_goal: calculatedData.weeks_to_goal || 0
          })
        });

        if (!calorieResponse.ok) {
          throw new Error('Failed to save calorie goal');
        }

        Alert.alert('Success', editingTarget ? 'Weight goal updated successfully!' : 'Weight goal added successfully!');
        closeModal();
        await loadData();
        return;
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to save weight goal');
        return;
      }
    }

    // Standard handling for other targets
    if (!selectedType || !targetValue) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const targetInfo = findTargetInfo(selectedType);
      const apiTargetType = selectedType === 'weight' ? 'ideal_weight' : selectedType;

      let dbValue = targetValue;
      let dbUnit = targetUnit || targetInfo?.unit;

      if (selectedType === 'weight') {
        if (targetUnit === 'lbs') {
          dbValue = (parseFloat(targetValue) / 2.20462).toFixed(2);
          dbUnit = 'kg';
        } else if (targetUnit === 'stone') {
          dbValue = (parseFloat(targetValue) * 6.35029).toFixed(2);
          dbUnit = 'kg';
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/targets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target_type: apiTargetType,
          target_value: dbValue,
          unit: dbUnit
        })
      });

      if (response.ok) {
        Alert.alert('Success', editingTarget ? 'Target updated successfully!' : 'Target added successfully!');
        closeModal();
        await loadData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to save target');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save target');
    }
  };

  const categories = [
    { key: 'all', label: 'All', icon: '📊' },
    { key: 'nutrition', label: 'Nutrition', icon: '🍎' },
    { key: 'vitals', label: 'Vitals', icon: '❤️' },
    { key: 'hydration', label: 'Hydration', icon: '💧' },
    { key: 'wellbeing', label: 'Well-being', icon: '🌟' },
  ];

  const filteredTargets = Object.entries(userTargets).filter(([type]) => {
    if (activeCategory === 'all') return true;
    const category = Object.entries(targetConfig).find(([key, cat]) => cat.targets[type] !== undefined);
    return category && category[0] === activeCategory;
  });

  const renderTargetCard = ([type, target]) => {
    const targetInfo = findTargetInfo(type);
    if (!targetInfo) return null;

    const progress = currentProgress[type] || 0;
    const numericTargetValue = parseFloat(target.value);
    const isNumeric = !isNaN(numericTargetValue) && numericTargetValue > 0;
    const percentage = isNumeric ? Math.min((progress / numericTargetValue) * 100, 100) : 0;

    return (
      <TouchableOpacity
        key={type}
        style={styles.targetCard}
        onPress={() => openModal(type)}
        activeOpacity={0.7}
      >
        <View style={styles.targetHeader}>
          <View style={styles.targetInfo}>
            <Text style={styles.targetIcon}>{targetInfo.icon}</Text>
            <View style={styles.targetTextInfo}>
              <Text style={styles.targetTitle}>{targetInfo.name}</Text>
              {isNumeric ? (
                <Text style={styles.targetValue}>
                  {Math.round(progress)} / {target.value} {target.unit || targetInfo.unit}
                </Text>
              ) : (
                <Text style={styles.targetValue}>{target.value}</Text>
              )}
            </View>
          </View>
        </View>

        {isNumeric && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(percentage)}% complete</Text>
          </View>
        )}

        <View style={styles.targetFooter}>
          <Text style={styles.targetCategory}>{targetInfo.categoryName}</Text>
          <TouchableOpacity onPress={() => openModal(type)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const availableTargetTypes = () => {
    const types = [];
    Object.entries(targetConfig).forEach(([categoryKey, category]) => {
      Object.entries(category.targets).forEach(([typeKey, target]) => {
        types.push({
          value: typeKey,
          label: target.name,
          category: category.name,
          ...target
        });
      });
    });
    return types;
  };

  const styles = createStyles(isDarkMode);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.black} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Targets</Text>
        <Text style={styles.headerSubtitle}>Set and track your personal health goals</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[styles.categoryTab, activeCategory === category.key && styles.activeCategoryTab]}
            onPress={() => setActiveCategory(category.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[styles.categoryText, activeCategory === category.key && styles.activeCategoryText]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 400 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent.primary} />}
      >
        <View style={styles.targetsGrid}>
          {filteredTargets.length > 0 ? (
            <>
              {filteredTargets.map(renderTargetCard)}
              <TouchableOpacity style={styles.addCard} onPress={() => openModal()}>
                <Text style={styles.addCardIcon}>+</Text>
                <Text style={styles.addCardText}>Add Target</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🎯</Text>
              <Text style={styles.emptyStateText}>No targets yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap + to add your first target</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => openModal()} activeOpacity={0.8}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent={true} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTarget ? 'Edit Target' : 'Add Target'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Target Type</Text>
              {editingTarget ? (
                <Text style={styles.disabledInput}>{findTargetInfo(selectedType)?.name}</Text>
              ) : (
                <ScrollView style={styles.typeSelector}>
                  {availableTargetTypes().map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[styles.typeOption, selectedType === type.value && styles.typeOptionSelected]}
                      onPress={() => {
                        setSelectedType(type.value);
                        setTargetUnit(type.unit);
                      }}
                    >
                      <Text style={styles.typeIcon}>{type.icon}</Text>
                      <View style={styles.typeInfo}>
                        <Text style={styles.typeName}>{type.label}</Text>
                        <Text style={styles.typeCategory}>{type.category}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {selectedType === 'weight' ? (
                <>
                  {/* Weight Goal Calorie Calculator */}
                  <Text style={styles.label}>Target Weight</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="70"
                      placeholderTextColor={COLORS.text.tertiary}
                      value={targetValue}
                      onChangeText={(val) => {
                        setTargetValue(val);
                        if (val && parseFloat(val) > 0) {
                          calculateCalories(val, targetUnit);
                        }
                      }}
                      keyboardType="numeric"
                    />
                    <View style={styles.unitSelector}>
                      {['kg', 'lbs', 'stone'].map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[styles.unitButton, targetUnit === unit && styles.unitButtonSelected]}
                          onPress={() => {
                            setTargetUnit(unit);
                            if (targetValue) calculateCalories(targetValue, unit);
                          }}
                        >
                          <Text style={[styles.unitButtonText, targetUnit === unit && styles.unitButtonTextSelected]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Text style={styles.label}>Goal Type</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { type: 'loss', label: 'Lose Weight', icon: '📉' },
                      { type: 'maintain', label: 'Maintain', icon: '⚖️' },
                      { type: 'gain', label: 'Gain Weight', icon: '📈' }
                    ].map((goal) => (
                      <TouchableOpacity
                        key={goal.type}
                        style={[styles.goalTypeButton, goalType === goal.type && styles.goalTypeButtonSelected]}
                        onPress={() => {
                          setGoalType(goal.type);
                          if (targetValue) calculateCalories(targetValue, targetUnit);
                        }}
                      >
                        <Text style={{ fontSize: 20, marginBottom: 4 }}>{goal.icon}</Text>
                        <Text style={[styles.goalTypeText, goalType === goal.type && styles.goalTypeTextSelected]}>
                          {goal.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {goalType !== 'maintain' && (
                    <>
                      <Text style={styles.label}>Weekly Rate</Text>
                      <View style={{ paddingHorizontal: 8 }}>
                        <Slider
                          style={{ width: '100%', height: 40 }}
                          minimumValue={0.25}
                          maximumValue={1.0}
                          step={0.01}
                          value={weeklyRate}
                          onValueChange={(val) => {
                            setWeeklyRate(val);
                            if (targetValue) calculateCalories(targetValue, targetUnit);
                          }}
                          minimumTrackTintColor={COLORS.accent.primary}
                          maximumTrackTintColor={COLORS.border}
                          thumbTintColor={COLORS.accent.primary}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                            {weeklyRateUnit === 'kg'
                              ? `${weeklyRate.toFixed(3)} kg/week`
                              : `${(weeklyRate * 2.20462).toFixed(2)} lbs/week`
                            }
                          </Text>
                          <TouchableOpacity
                            style={styles.unitToggle}
                            onPress={() => setWeeklyRateUnit(weeklyRateUnit === 'kg' ? 'lbs' : 'kg')}
                          >
                            <Text style={styles.unitToggleText}>kg ⇄ lbs</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ color: COLORS.text.tertiary, fontSize: 12, marginTop: 4 }}>
                          {goalType === 'gain'
                            ? 'Recommended: 0.25-0.5 kg/week for healthy weight gain'
                            : 'Recommended: 0.5-0.7 kg/week for healthy weight loss'
                          }
                        </Text>
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>Activity Level</Text>
                  <View style={styles.pickerContainer}>
                    {[
                      { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
                      { value: 'light', label: 'Light (exercise 1-3 days/week)' },
                      { value: 'moderate', label: 'Moderate (exercise 3-5 days/week)' },
                      { value: 'very_active', label: 'Very Active (exercise 6-7 days/week)' },
                      { value: 'extra_active', label: 'Extra Active (intense exercise daily)' }
                    ].map((level) => (
                      <TouchableOpacity
                        key={level.value}
                        style={[styles.pickerOption, activityLevel === level.value && styles.pickerOptionSelected]}
                        onPress={() => {
                          setActivityLevel(level.value);
                          if (targetValue) calculateCalories(targetValue, targetUnit);
                        }}
                      >
                        <Text style={[styles.pickerOptionText, activityLevel === level.value && styles.pickerOptionTextSelected]}>
                          {level.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {calculatedData && (
                    <View style={styles.resultsContainer}>
                      <Text style={styles.resultsTitle}>Calculated Targets</Text>
                      {calculatedData.current_weight_kg && (
                        <View style={styles.resultRow}>
                          <Text style={styles.resultLabel}>Current Weight:</Text>
                          <Text style={styles.resultValue}>{calculatedData.current_weight_kg.toFixed(1)} kg</Text>
                        </View>
                      )}
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>BMR:</Text>
                        <Text style={styles.resultValue}>{calculatedData.bmr} cal/day</Text>
                      </View>
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>TDEE:</Text>
                        <Text style={styles.resultValue}>{calculatedData.tdee} cal/day</Text>
                      </View>
                      <View style={[styles.resultRow, { paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                        <Text style={styles.resultLabel}>Daily Target:</Text>
                        <Text style={[styles.resultValue, { color: COLORS.accent.primary, fontWeight: '700', fontSize: 18 }]}>
                          {calculatedData.target_calories} cal/day
                        </Text>
                      </View>
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Time to Goal:</Text>
                        <Text style={styles.resultValue}>
                          {calculatedData.weeks_to_goal > 0
                            ? `${calculatedData.weeks_to_goal} weeks`
                            : goalType === 'maintain' ? 'Maintaining current weight' : 'At target weight'
                          }
                        </Text>
                      </View>

                      <View style={styles.formulaContainer}>
                        <Text style={styles.formulaText}>
                          BMR = Mifflin-St Jeor Formula{'\n'}
                          TDEE = BMR × Activity ({activityLevel.replace('_', ' ')}){'\n'}
                          {goalType !== 'maintain' && calculatedData.daily_adjustment && (
                            `Daily ${goalType === 'gain' ? 'Surplus' : 'Deficit'} = (${weeklyRate.toFixed(3)} kg/week × 7700 cal/kg) ÷ 7 = ${Math.abs(calculatedData.daily_adjustment)} cal\n` +
                            `Target = TDEE ${calculatedData.daily_adjustment > 0 ? '+' : '-'} ${Math.abs(calculatedData.daily_adjustment)} = ${calculatedData.target_calories} cal/day`
                          )}
                          {goalType === 'maintain' && 'Target = TDEE (maintenance mode)'}
                        </Text>
                      </View>

                      {calculatedData.warning && (
                        <View style={styles.warningContainer}>
                          <Text style={styles.warningText}>⚠️ {calculatedData.warning}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              ) : selectedType ? (
                <>
                  <Text style={styles.label}>Target Value</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={findTargetInfo(selectedType)?.placeholder}
                    placeholderTextColor={COLORS.text.tertiary}
                    value={targetValue}
                    onChangeText={setTargetValue}
                    keyboardType={selectedType === 'bloodpressure' || selectedType === 'fasting_window' ? 'default' : 'numeric'}
                  />

                  {findTargetInfo(selectedType)?.alternateUnits && (
                    <>
                      <Text style={styles.label}>Unit</Text>
                      <View style={styles.unitSelector}>
                        {findTargetInfo(selectedType).alternateUnits.map((unit) => (
                          <TouchableOpacity
                            key={unit}
                            style={[styles.unitButton, targetUnit === unit && styles.unitButtonSelected]}
                            onPress={() => setTargetUnit(unit)}
                          >
                            <Text style={[styles.unitButtonText, targetUnit === unit && styles.unitButtonTextSelected]}>
                              {unit}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </>
              ) : null}
            </ScrollView>

            {/* Action buttons fixed at bottom, outside ScrollView */}
            {selectedType && (
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveTarget}>
                  <Text style={styles.saveButtonText}>{selectedType === 'weight' ? 'Save Goal' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  categoryContainer: {
    maxHeight: 60,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background.secondary,
  },
  activeCategoryTab: {
    backgroundColor: COLORS.accent.primary,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  activeCategoryText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  targetsGrid: {
    paddingTop: 16,
  },
  targetCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  targetHeader: {
    marginBottom: 12,
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  targetTextInfo: {
    flex: 1,
  },
  targetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 14,
    color: COLORS.accent.primary,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  targetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetCategory: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  editButtonText: {
    fontSize: 14,
    color: COLORS.accent.primary,
    fontWeight: '500',
  },
  addCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addCardIcon: {
    fontSize: 32,
    color: COLORS.accent.primary,
    marginBottom: 8,
  },
  addCardText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.accent.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: COLORS.accent.primary,
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalClose: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 16,
  },
  disabledInput: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.tertiary,
  },
  typeSelector: {
    maxHeight: 250,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.accent.primary,
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  typeCategory: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  input: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  unitButtonSelected: {
    backgroundColor: COLORS.accent.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  unitButtonTextSelected: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background.secondary,
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
    fontWeight: '500',
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
  goalTypeButton: {
    flex: 1,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.tertiary,
  },
  goalTypeButtonSelected: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderColor: COLORS.accent.primary,
  },
  goalTypeText: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontWeight: '500',
    textAlign: 'center',
  },
  goalTypeTextSelected: {
    color: COLORS.accent.primary,
  },
  unitToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background.tertiary,
  },
  unitToggleText: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderColor: COLORS.accent.primary,
  },
  pickerOptionText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  pickerOptionTextSelected: {
    color: COLORS.accent.primary,
    fontWeight: '500',
  },
  resultsContainer: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resultLabel: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
  },
  formulaContainer: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },
  formulaText: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});