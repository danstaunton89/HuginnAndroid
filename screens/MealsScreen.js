import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Alert, RefreshControl, TextInput, Animated, Keyboard, Modal, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function MealsScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('meals');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [newMealId, setNewMealId] = useState(null);
  const [newIngredientId, setNewIngredientId] = useState(null);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);

  // Data from APIs - no fake data
  const [meals, setMeals] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [plannedMeals, setPlannedMeals] = useState({});
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [viewMode, setViewMode] = useState('weekly');
  const [mealSearchQuery, setMealSearchQuery] = useState('');

  // AI Analysis state
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState(null);
  const [aiAnalysisPeriod, setAiAnalysisPeriod] = useState('week');
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    const monday = getMonday(new Date());
    setCurrentWeekStart(monday);
    loadData();
  }, []);

  // Load planned meals when week changes or when returning to planner tab
  useEffect(() => {
    if (currentWeekStart && activeTab === 'planner') {
      loadPlannedMeals();
    }
  }, [currentWeekStart, activeTab]);

  // Also reload when planner tab becomes active
  useEffect(() => {
    if (activeTab === 'planner' && currentWeekStart) {
      loadPlannedMeals();
    }
  }, [activeTab]);

  // Clear search query when switching tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // Helper function to get Monday of a given date
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  // Format date as YYYY-MM-DD (local timezone)
  function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Normalize date from API (handles ISO strings with timezone)
  function normalizeDateKey(dateStr) {
    const d = new Date(dateStr);
    return formatDate(d);
  }

  // Get day name from date
  function getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
  }

  // Get short day name
  function getShortDayName(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(date).getDay()];
  }

  // Load planned meals from API
  const loadPlannedMeals = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      const startDate = formatDate(currentWeekStart);
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 6);
      const endDateStr = formatDate(endDate);

      const response = await fetch(
        `${API_BASE_URL}/api/meal-plans?start=${startDate}&end=${endDateStr}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load meal plans: ${response.status}`);
      }

      const data = await response.json();
      const organized = {};

      // Handle multiple meals per slot (API returns array of meals)
      data.forEach(plan => {
        const normalizedDate = normalizeDateKey(plan.date);
        const key = `${normalizedDate}_${plan.meal_type}`;

        // Support multiple meals per slot
        if (!organized[key]) {
          organized[key] = [];
        }
        organized[key].push({
          id: plan.id,
          meal: {
            name: plan.meal_name,
            total_calories: plan.total_calories
          }
        });
      });

      setPlannedMeals(organized);
    } catch (error) {
      // Error handling
    }
  };

  // Handle slot press to assign meal
  const handleSlotPress = (date, mealType) => {
    setSelectedSlot({ date, mealType });
    setShowMealSelector(true);
  };

  // Assign meal to slot
  const assignMealToSlot = async (mealId) => {
    if (!selectedSlot) return;

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const dateStr = formatDate(selectedSlot.date);
      const response = await fetch(`${API_BASE_URL}/api/meal-plans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meal_id: mealId,
          date: dateStr,
          meal_type: selectedSlot.mealType
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign meal');
      }

      const result = await response.json();
      setShowMealSelector(false);
      setSelectedSlot(null);
      await loadPlannedMeals();

    } catch (error) {
      Alert.alert('Error', `Failed to assign meal: ${error.message}`);
    }
  };

  // Remove meal from slot
  const removeMealFromSlot = async (planId) => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/meal-plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove meal');
      }

      await loadPlannedMeals();
    } catch (error) {
      Alert.alert('Error', `Failed to remove meal: ${error.message}`);
    }
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeekStart);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeekStart(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeekStart);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeekStart(newWeek);
  };

  // Get week dates
  const getWeekDates = () => {
    if (!currentWeekStart) return [];
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // AI Analysis functions
  const openAIAnalysis = () => {
    setShowAIAnalysis(true);
    runAIAnalysis();
  };

  const runAIAnalysis = async () => {
    setAiAnalysisLoading(true);
    setAiAnalysisData(null);

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      let startDate, endDate, period;

      if (aiAnalysisPeriod === 'day') {
        const today = new Date();
        const dateStr = formatDate(today);
        startDate = dateStr;
        endDate = dateStr;
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(today);
        period = dayName;
      } else {
        if (!currentWeekStart) return;
        startDate = formatDate(currentWeekStart);
        const endDateObj = new Date(currentWeekStart);
        endDateObj.setDate(endDateObj.getDate() + 6);
        endDate = formatDate(endDateObj);
        period = `Week of ${startDate}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/ai/analyze-meal-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ startDate, endDate, period })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to analyze meal plan');
      }

      setAiAnalysisData(data.analysis);
    } catch (error) {
      Alert.alert('AI Analysis Error', error.message);
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const changeAnalysisPeriod = (period) => {
    setAiAnalysisPeriod(period);
  };

  // Re-run analysis when period changes
  useEffect(() => {
    if (showAIAnalysis) {
      runAIAnalysis();
    }
  }, [aiAnalysisPeriod]);

  // Refresh when screen comes into focus (especially after creating a meal)
  useFocusEffect(
    React.useCallback(() => {
      // Check if we should refresh and if there's a new meal or ingredient to highlight
      if (route.params?.refresh) {
        const { newMeal, newIngredient } = route.params;
        setNewMealId(newMeal);
        setNewIngredientId(newIngredient);

        if (newMeal) {
          setActiveTab('meals'); // Switch to meals tab
          loadMeals(); // Refresh meals list
        }
        if (newIngredient) {
          setActiveTab('ingredients'); // Switch to ingredients tab
          loadIngredients(); // Refresh ingredients list
        }

        // Clear the params to prevent refreshing on every focus
        navigation.setParams({ refresh: false, newMeal: null, newIngredient: null });

        // Start subtle animation for new meal highlight
        if (newMeal) {
          animatedValue.setValue(0); // Reset animation value
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(animatedValue, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: false,
            }),
          ]).start(() => {
            setNewMealId(null); // Clear highlight after animation
          });
        }

        // Start subtle animation for new ingredient highlight
        if (newIngredient) {
          animatedValue.setValue(0); // Reset animation value
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(animatedValue, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: false,
            }),
          ]).start(() => {
            setNewIngredientId(null); // Clear highlight after animation
          });
        }
      }
    }, [route.params?.refresh, route.params?.newMeal, route.params?.newIngredient])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMeals(),
        loadIngredients(),
      ]);
    } catch (err) {
      } finally {
      setLoading(false);
    }
  };

  const loadMeals = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/meals`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load meals: ${response.status}`);
      }
      const data = await response.json();
      setMeals(data);
    } catch (error) {
      setMeals([]);
    }
  };

  const loadIngredients = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/ingredients`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load ingredients: ${response.status}`);
      }
      const data = await response.json();
      setIngredients(data);
    } catch (error) {
      setIngredients([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (err) {
      // Error handling already done in loadData
    } finally {
      setRefreshing(false);
    }
  };

  // Custom Tab Bar matching your screenshots
  const CustomTabBar = () => {
    const tabs = [
      { key: 'planner', label: 'Planner', icon: '📅' },
      { key: 'meals', label: 'Meals', icon: '🍽️' },
      { key: 'ingredients', label: 'Ingredients', icon: '👁️' }
    ];

    // Get tab color based on type
    const getTabColor = (tabKey) => {
      if (tabKey === 'meals') return COLORS.accent.primary; // Teal for meals
      if (tabKey === 'ingredients') return COLORS.accent.secondary; // Mint teal for ingredients
      return COLORS.accent.tertiary; // Darker teal for planner
    };

    return (
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && {
                ...styles.activeTab,
                backgroundColor: getTabColor(tab.key)
              }
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabIcon, activeTab === tab.key && styles.activeTabIcon]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Nutrition Badge Component - with dynamic default based on active tab
  const NutritionBadge = ({ value, label, color, icon }) => {
    const defaultColor = activeTab === 'meals' ? COLORS.accent.primary : activeTab === 'ingredients' ? COLORS.accent.secondary : COLORS.accent.tertiary;
    const badgeColor = color || defaultColor;
    return (
      <View style={[styles.nutritionBadge, { backgroundColor: badgeColor + '15', borderColor: badgeColor, borderWidth: 1 }]}>
        {icon && (
          <View style={[styles.nutritionIconCircle, { backgroundColor: badgeColor }]}>
            <Text style={styles.nutritionIcon}>{icon}</Text>
          </View>
        )}
        <Text style={[styles.badgeValue, { color: badgeColor }]}>{value}g</Text>
        <Text style={[styles.badgeLabel, { color: badgeColor + 'CC' }]}>{label}</Text>
      </View>
    );
  };

  // Button handlers for meal actions
  const handleEditMeal = async (meal) => {
    try {
      // Fetch full meal data with ingredients from API
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/meals/${meal.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load meal details: ${response.status}`);
      }

      const mealData = await response.json();

      // Navigate to CreateMeal screen with edit mode and meal data
      navigation.navigate('CreateMeal', {
        editMode: true,
        mealData: mealData
      });

    } catch (error) {
      Alert.alert('Error', `Failed to load meal for editing: ${error.message}`);
    }
  };

  const handleCopyMeal = (meal) => {
    Alert.alert('Copy Meal', `Copy functionality for "${meal.name}" coming soon!`);
  };

  const handleDeleteMeal = async (meal) => {
    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${meal.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const authToken = await AsyncStorage.getItem('authToken');
              if (!authToken) {
                Alert.alert('Error', 'Please log in again');
                return;
              }

              const response = await fetch(`${API_BASE_URL}/api/meals/${meal.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              });

              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete meal');
              }

              // Refresh meals list
              await loadMeals();

            } catch (error) {
              Alert.alert('Error', `Failed to delete meal: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Ingredient action handlers
  const handleEditIngredient = (ingredient) => {
    // Navigate to AddIngredient screen with the ingredient data for editing
    navigation.navigate('AddIngredient', {
      editMode: true,
      ingredientData: ingredient
    });
  };

  const handleDeleteIngredient = async (ingredient) => {
    Alert.alert(
      'Delete Ingredient',
      `Are you sure you want to delete "${ingredient.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const authToken = await AsyncStorage.getItem('authToken');
              if (!authToken) {
                Alert.alert('Error', 'Please log in again');
                return;
              }

              const response = await fetch(`${API_BASE_URL}/api/ingredients/${ingredient.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              });

              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete ingredient');
              }

              // Refresh ingredients list
              await loadIngredients();

            } catch (error) {
              Alert.alert('Error', `Failed to delete ingredient: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Meal Card Component (matching your screenshots)
  const MealCard = ({ meal, animatedStyle }) => {
    // Calculate nutritional badges
    const badges = [];
    const calories = meal.total_calories || 0;
    const protein = meal.total_protein || 0;
    const carbs = meal.total_carbs || 0;
    const fat = meal.total_fat || 0;
    const fiber = meal.total_fiber || 0;

    // Nutritional ratios per 100 calories
    const proteinPer100Cal = calories > 0 ? (protein * 4 / calories) * 100 : 0;
    const carbsPer100Cal = calories > 0 ? (carbs * 4 / calories) * 100 : 0;
    const fatPer100Cal = calories > 0 ? (fat * 9 / calories) * 100 : 0;

    // Add badges based on nutritional profile
    if (proteinPer100Cal >= 30) badges.push({ label: "HIGH PROTEIN", emoji: "💪", color: COLORS.accent.primary });
    if (carbsPer100Cal <= 20) badges.push({ label: "LOW CARB", emoji: "🥬", color: COLORS.accent.secondary });
    if (fatPer100Cal <= 15) badges.push({ label: "LOW FAT", emoji: "🥗", color: COLORS.accent.light });
    if (fiber >= 5) badges.push({ label: "HIGH FIBER", emoji: "🌾", color: COLORS.accent.tertiary });
    if (calories <= 300) badges.push({ label: "LIGHT", emoji: "✨", color: COLORS.accent.secondary });
    if (protein >= 20) badges.push({ label: "PROTEIN RICH", emoji: "🥩", color: COLORS.accent.primary });

    return (
      <Animated.View style={[styles.mealCard, animatedStyle]}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleRow}>
            <Text style={styles.mealName}>{meal.name || 'Unnamed Meal'}</Text>
            <View style={styles.calorieHighlight}>
              <Text style={styles.calorieValue}>{Math.round(calories)}</Text>
              <Text style={styles.calorieLabel}>cal</Text>
            </View>
          </View>
          {badges.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesContainer}>
              {badges.map((badge, index) => (
                <View key={index} style={[styles.badge, { backgroundColor: badge.color + '20', borderColor: badge.color }]}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.nutritionRow}>
          <NutritionBadge value={Math.round(protein)} label="PROTEIN" color={COLORS.accent.primary} icon="P" />
          <NutritionBadge value={Math.round(carbs)} label="CARBS" color={COLORS.accent.secondary} icon="C" />
          <NutritionBadge value={Math.round(fat)} label="FAT" color={COLORS.accent.tertiary} icon="F" />
          <NutritionBadge value={Math.round(fiber)} label="FIBER" color={COLORS.accent.light} icon="Fi" />
        </View>

        <Text style={styles.mealServing}>Per 100.0 g</Text>

        <View style={styles.mealActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditMeal(meal)}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleCopyMeal(meal)}>
            <Text style={styles.actionButtonText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteMeal(meal)}>
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Ingredient Card Component with enhanced visuals
  const IngredientCard = ({ ingredient, animatedStyle }) => {
    const calories = ingredient.calories || 0;
    const protein = ingredient.protein || 0;
    const carbs = ingredient.carbs || 0;
    const fat = ingredient.fat || 0;
    const fiber = ingredient.fiber || 0;

    // Generate badges for ingredients too
    const badges = [];
    const proteinPer100g = protein;
    const carbsPer100g = carbs;
    const fatPer100g = fat;

    if (proteinPer100g >= 15) badges.push({ label: "PROTEIN", emoji: "💪", color: COLORS.accent.primary });
    if (carbsPer100g <= 5) badges.push({ label: "LOW CARB", emoji: "🥬", color: COLORS.accent.secondary });
    if (fatPer100g <= 3) badges.push({ label: "LOW FAT", emoji: "🥗", color: COLORS.accent.light });
    if (fiber >= 5) badges.push({ label: "HIGH FIBER", emoji: "🌾", color: COLORS.accent.tertiary });
    if (calories <= 50) badges.push({ label: "LOW CAL", emoji: "✨", color: COLORS.accent.secondary });

    return (
      <Animated.View style={[styles.mealCard, animatedStyle]}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleRow}>
            <Text style={styles.mealName}>{ingredient.name || 'Unnamed Ingredient'}</Text>
            <View style={[styles.calorieHighlight, { backgroundColor: COLORS.accent.secondary }]}>
              <Text style={styles.calorieValue}>{Math.round(calories)}</Text>
              <Text style={styles.calorieLabel}>cal</Text>
            </View>
          </View>
          {ingredient.barcode && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedCheck}>✓</Text>
              <Text style={styles.verifiedLabel}>VERIFIED</Text>
            </View>
          )}
          {badges.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesContainer}>
              {badges.map((badge, index) => (
                <View key={index} style={[styles.badge, { backgroundColor: badge.color + '20', borderColor: badge.color }]}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.nutritionRow}>
          <NutritionBadge value={Math.round(protein)} label="PROTEIN" color={COLORS.accent.primary} icon="P" />
          <NutritionBadge value={Math.round(carbs)} label="CARBS" color={COLORS.accent.secondary} icon="C" />
          <NutritionBadge value={Math.round(fat)} label="FAT" color={COLORS.accent.tertiary} icon="F" />
          <NutritionBadge value={Math.round(fiber)} label="FIBER" color={COLORS.accent.light} icon="Fi" />
        </View>

        <Text style={styles.mealServing}>Per 100.0 g</Text>

        <View style={styles.mealActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditIngredient(ingredient)}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteIngredient(ingredient)}>
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Render content for each tab
  const renderTabContent = () => {
    if (activeTab === 'planner') {
      const weekDates = getWeekDates();
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];

      return (
        <View style={styles.plannerContent}>
          {/* AI Analysis Button */}
          <TouchableOpacity
            style={styles.aiAnalysisButton}
            onPress={openAIAnalysis}
            activeOpacity={0.8}
          >
            <Text style={styles.aiAnalysisButtonText}>🤖 AI Analysis</Text>
          </TouchableOpacity>

          {/* View Mode Toggle */}
          <View style={styles.planControls}>
            <TouchableOpacity
              style={[styles.planButton, viewMode === 'weekly' && styles.activePlanButton]}
              onPress={() => setViewMode('weekly')}
            >
              <Text style={styles.planButtonIcon}>📅</Text>
              <Text style={[styles.planButtonText, viewMode === 'weekly' && styles.activePlanButtonText]}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.planButton, viewMode === 'daily' && styles.activePlanButton]}
              onPress={() => setViewMode('daily')}
            >
              <Text style={styles.planButtonIcon}>⏰</Text>
              <Text style={[styles.planButtonText, viewMode === 'daily' && styles.activePlanButtonText]}>Daily</Text>
            </TouchableOpacity>
          </View>

          {/* Current Week Display (no navigation) */}
          <View style={styles.weekNavigation}>
            <View style={styles.weekInfo}>
              <Text style={styles.weekTitle}>Current Week</Text>
              <Text style={styles.weekSubtitle}>
                {currentWeekStart ? formatDate(currentWeekStart) : ''} - {currentWeekStart ? formatDate(new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000)) : ''}
              </Text>
            </View>
          </View>

          {/* Weekly Grid */}
          {viewMode === 'weekly' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeklyGrid}>
              {weekDates.map((date, dayIndex) => {
                const dateStr = formatDate(date);
                const dayTotal = mealTypes.reduce((sum, type) => {
                  const key = `${dateStr}_${type}`;
                  const mealsInSlot = plannedMeals[key]; // Now an array
                  if (mealsInSlot && Array.isArray(mealsInSlot)) {
                    return sum + mealsInSlot.reduce((mealSum, plan) => mealSum + (plan?.meal?.total_calories || 0), 0);
                  }
                  return sum;
                }, 0);

                return (
                  <View key={dayIndex} style={styles.dayColumn}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayTitle}>{getShortDayName(date)}</Text>
                      <Text style={styles.dayDate}>{date.getDate()}</Text>
                      <Text style={styles.dayCalories}>{Math.round(dayTotal)} cal</Text>
                    </View>

                    {mealTypes.map((mealType) => {
                      const key = `${dateStr}_${mealType}`;
                      const mealsInSlot = plannedMeals[key]; // Now an array

                      return (
                        <TouchableOpacity
                          key={mealType}
                          style={styles.mealSlotCard}
                          onPress={() => handleSlotPress(date, mealType)}
                        >
                          <Text style={styles.mealTypeLabel}>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</Text>
                          {mealsInSlot && mealsInSlot.length > 0 ? (
                            <View style={styles.assignedMeals}>
                              {mealsInSlot.map((plan, idx) => (
                                <TouchableOpacity
                                  key={plan.id}
                                  style={styles.assignedMeal}
                                  onLongPress={() => removeMealFromSlot(plan.id)}
                                >
                                  <Text style={styles.assignedMealName} numberOfLines={2}>{plan.meal.name}</Text>
                                  <Text style={styles.assignedMealCal}>{Math.round(plan.meal.total_calories || 0)} cal</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.emptySlotText}>+ Add</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Daily View - Only show today */}
          {viewMode === 'daily' && (
            <View style={styles.dailyView}>
              {(() => {
                const today = new Date();
                const dateStr = formatDate(today);
                const dayTotal = mealTypes.reduce((sum, type) => {
                  const key = `${dateStr}_${type}`;
                  const mealsInSlot = plannedMeals[key]; // Now an array
                  if (mealsInSlot && Array.isArray(mealsInSlot)) {
                    return sum + mealsInSlot.reduce((mealSum, plan) => mealSum + (plan?.meal?.total_calories || 0), 0);
                  }
                  return sum;
                }, 0);

                return (
                  <View style={styles.dayCard}>
                    <View style={styles.dayCardHeader}>
                      <Text style={styles.dayCardTitle}>Today - {getDayName(today)}</Text>
                      <Text style={styles.dayCardDate}>{formatDate(today)}</Text>
                      <Text style={styles.dayCardCalories}>{Math.round(dayTotal)} cal</Text>
                    </View>

                    {mealTypes.map((mealType) => {
                      const key = `${dateStr}_${mealType}`;
                      const mealsInSlot = plannedMeals[key]; // Now an array

                      return (
                        <View key={mealType} style={styles.dailyMealSlot}>
                          <Text style={styles.dailyMealType}>• {mealType.charAt(0).toUpperCase() + mealType.slice(1)}</Text>
                          {mealsInSlot && mealsInSlot.length > 0 ? (
                            <View style={styles.dailyMealsContainer}>
                              {mealsInSlot.map((plan) => (
                                <TouchableOpacity
                                  key={plan.id}
                                  style={styles.dailyAssignedMeal}
                                  onLongPress={() => removeMealFromSlot(plan.id)}
                                >
                                  <Text style={styles.dailyMealName}>{plan.meal.name}</Text>
                                  <Text style={styles.dailyMealCal}>{Math.round(plan.meal.total_calories || 0)} cal</Text>
                                </TouchableOpacity>
                              ))}
                              <TouchableOpacity
                                style={styles.dailyAddMoreButton}
                                onPress={() => handleSlotPress(today, mealType)}
                              >
                                <Text style={styles.dailyAddMoreText}>+ Add Another</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.dailyAddButton}
                              onPress={() => handleSlotPress(today, mealType)}
                            >
                              <Text style={styles.dailyAddText}>+ Add</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Meal Selector Modal - Simple search only */}
          {showMealSelector && (
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => {
                  setShowMealSelector(false);
                  setMealSearchQuery('');
                }}
              />
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Search for Meal</Text>
                  <TouchableOpacity onPress={() => {
                    setShowMealSelector(false);
                    setMealSearchQuery('');
                  }}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  {/* Search Input */}
                  <View style={styles.mealSearchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={styles.mealSearchInput}
                      placeholder="Type to search..."
                      placeholderTextColor={COLORS.text.tertiary}
                      value={mealSearchQuery}
                      onChangeText={setMealSearchQuery}
                      autoFocus={false}
                    />
                  </View>

                  {/* Only show results when user has typed something */}
                  {mealSearchQuery.length > 0 && (
                    <ScrollView style={styles.modalList}>
                      {meals
                        .filter(meal =>
                          meal.name.toLowerCase().includes(mealSearchQuery.toLowerCase())
                        )
                        .map((meal) => (
                          <TouchableOpacity
                            key={meal.id}
                            style={styles.modalMealItem}
                            onPress={() => {
                              assignMealToSlot(meal.id);
                              setMealSearchQuery('');
                            }}
                          >
                            <Text style={styles.modalMealName}>{meal.name}</Text>
                            <Text style={styles.modalMealCal}>{Math.round(meal.total_calories || 0)} cal</Text>
                          </TouchableOpacity>
                        ))}
                      {meals.filter(meal =>
                        meal.name.toLowerCase().includes(mealSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <Text style={styles.noResults}>No meals found</Text>
                      )}
                    </ScrollView>
                  )}

                  {/* Show hint when search is empty */}
                  {mealSearchQuery.length === 0 && (
                    <View style={styles.searchHint}>
                      <Text style={styles.searchHintText}>Start typing to find meals</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      );
    }

    if (activeTab === 'meals') {
      // Filter meals based on search query
      const filteredMeals = meals.filter(meal =>
        meal.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return (
        <View>
          {filteredMeals.length > 0 ? (
            filteredMeals.map((meal, index) => {
              // Create animation style for new meal
              const isNewMeal = newMealId && meal.id === newMealId;
              const animatedStyle = isNewMeal ? {
                backgroundColor: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [COLORS.background.secondary, COLORS.background.tertiary], // Subtle highlight
                }),
                borderColor: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [COLORS.border, COLORS.accent.primary], // Orange border highlight for meals
                }),
                borderWidth: 1,
              } : null;

              return (
                <MealCard
                  key={meal.id || index}
                  meal={meal}
                  animatedStyle={animatedStyle}
                />
              );
            })
          ) : searchQuery.length > 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No meals found</Text>
              <Text style={styles.emptySubtitle}>Try a different search term</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>No meals yet</Text>
              <Text style={styles.emptySubtitle}>Create your first meal to get started</Text>
            </View>
          )}
        </View>
      );
    }

    if (activeTab === 'ingredients') {
      // Filter ingredients based on search query
      const filteredIngredients = ingredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return (
        <View>
          {filteredIngredients.length > 0 ? (
            filteredIngredients.map((ingredient, index) => {
              // Create animation style for new ingredient
              const isNewIngredient = newIngredientId && ingredient.id === newIngredientId;
              const animatedStyle = isNewIngredient ? {
                backgroundColor: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [COLORS.background.secondary, COLORS.background.tertiary], // Subtle highlight
                }),
                borderColor: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [COLORS.border, COLORS.accent.secondary], // Green border highlight for ingredients
                }),
                borderWidth: 1,
              } : null;

              return (
                <IngredientCard
                  key={ingredient.id || index}
                  ingredient={ingredient}
                  animatedStyle={animatedStyle}
                />
              );
            })
          ) : searchQuery.length > 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No ingredients found</Text>
              <Text style={styles.emptySubtitle}>Try a different search term</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🥕</Text>
              <Text style={styles.emptyTitle}>No ingredients yet</Text>
              <Text style={styles.emptySubtitle}>Add ingredients to build your database</Text>
            </View>
          )}
        </View>
      );
    }
  };

  const getAddButtonText = () => {
    if (activeTab === 'meals') return '+ Create Meal';
    if (activeTab === 'ingredients') return '+ Add Ingredient';
    return '+ Add Item';
  };

  const getSearchPlaceholder = () => {
    if (activeTab === 'meals') return 'Search meals...';
    if (activeTab === 'ingredients') return 'Search ingredients...';
    return 'Search...';
  };

  const handleAddButton = () => {
    if (activeTab === 'meals') {
      navigation.navigate('CreateMeal');
    } else if (activeTab === 'ingredients') {
      navigation.navigate('AddIngredient');
    }
  };

  // Get dynamic color based on active tab
  const getActiveTabColor = () => {
    if (activeTab === 'meals') return COLORS.accent.primary; // Teal for meals
    if (activeTab === 'ingredients') return COLORS.accent.secondary; // Mint teal for ingredients
    return COLORS.accent.tertiary; // Darker teal for planner
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.black} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meals &{'\n'}Ingredients</Text>
      </View>

      {/* Custom Tab Bar */}
      <CustomTabBar />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 400 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={getActiveTabColor()}
            titleColor={getActiveTabColor()}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer} pointerEvents="box-none">
          <Text style={styles.searchIcon} pointerEvents="none">🔍</Text>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={getSearchPlaceholder()}
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            underlineColorAndroid="transparent"
            selectTextOnFocus={false}
          />
        </View>

        {/* Add Button */}
        {activeTab === 'meals' ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.aiButton, { backgroundColor: '#FF6B35' }]}
              onPress={() => navigation.navigate('AIMealGenerator')}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>✨ AI Generate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, styles.halfButton, { backgroundColor: getActiveTabColor() }]}
              onPress={handleAddButton}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>+ Create Meal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: getActiveTabColor() }]}
            onPress={handleAddButton}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>{getAddButtonText()}</Text>
          </TouchableOpacity>
        )}

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Floating Action Button */}
      {activeTab !== 'planner' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: getActiveTabColor() }]}
          onPress={handleAddButton}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* AI Analysis Modal */}
      <Modal
        visible={showAIAnalysis}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAIAnalysis(false)}
      >
        <View style={styles.aiModalOverlay}>
          <TouchableOpacity
            style={styles.aiModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAIAnalysis(false)}
          />
          <View style={styles.aiModalContent}>
            {/* Modal Header */}
            <View style={styles.aiModalHeader}>
              <Text style={styles.aiModalTitle}>AI Nutritional Analysis</Text>
              <View style={styles.aiPeriodToggle}>
                <TouchableOpacity
                  style={[styles.aiToggleBtn, aiAnalysisPeriod === 'week' && styles.aiToggleBtnActive]}
                  onPress={() => changeAnalysisPeriod('week')}
                >
                  <Text style={[styles.aiToggleBtnText, aiAnalysisPeriod === 'week' && styles.aiToggleBtnTextActive]}>Week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.aiToggleBtn, aiAnalysisPeriod === 'day' && styles.aiToggleBtnActive]}
                  onPress={() => changeAnalysisPeriod('day')}
                >
                  <Text style={[styles.aiToggleBtnText, aiAnalysisPeriod === 'day' && styles.aiToggleBtnTextActive]}>Today</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setShowAIAnalysis(false)}>
                <Text style={styles.aiModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.aiModalBody}>
              {aiAnalysisLoading ? (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="large" color="#8b5cf6" />
                  <Text style={styles.aiLoadingText}>Analyzing your meal plan...</Text>
                </View>
              ) : aiAnalysisData ? (
                <View>
                  {/* Calorie Analysis */}
                  {aiAnalysisData.calorie_analysis && (
                    <View style={styles.aiSection}>
                      <Text style={styles.aiSectionTitle}>📊 Calorie Analysis</Text>
                      <View style={styles.aiComparisonGrid}>
                        <View style={styles.aiComparisonItem}>
                          <Text style={styles.aiComparisonLabel}>Actual Avg</Text>
                          <Text style={styles.aiComparisonValue}>{Math.round(aiAnalysisData.calorie_analysis.actual_avg || 0)}</Text>
                        </View>
                        <View style={styles.aiComparisonItem}>
                          <Text style={styles.aiComparisonLabel}>Target</Text>
                          <Text style={styles.aiComparisonValue}>{Math.round(aiAnalysisData.calorie_analysis.target || 0)}</Text>
                        </View>
                        <View style={styles.aiComparisonItem}>
                          <Text style={[
                            styles.aiComparisonLabel,
                            Math.abs(aiAnalysisData.calorie_analysis.deviation || 0) > 20 && { color: '#ef4444' }
                          ]}>Deviation</Text>
                          <Text style={[
                            styles.aiComparisonValue,
                            Math.abs(aiAnalysisData.calorie_analysis.deviation || 0) > 20 && { color: '#ef4444' }
                          ]}>{aiAnalysisData.calorie_analysis.deviation > 0 ? '+' : ''}{Math.round(aiAnalysisData.calorie_analysis.deviation || 0)}%</Text>
                        </View>
                      </View>
                      <Text style={styles.aiAnalysisText}>{aiAnalysisData.calorie_analysis.analysis}</Text>
                    </View>
                  )}

                  {/* Macro Analysis */}
                  {aiAnalysisData.macro_analysis && (
                    <View style={styles.aiSection}>
                      <Text style={styles.aiSectionTitle}>🥗 Macronutrient Analysis</Text>
                      <View style={styles.aiMacroGrid}>
                        {['protein', 'carbs', 'fat'].map((macro) => {
                          const data = aiAnalysisData.macro_analysis[macro];
                          if (!data) return null;
                          const statusColor = data.status === 'adequate' ? '#10b981' :
                                             data.status === 'low' ? '#ef4444' : '#f59e0b';
                          return (
                            <View key={macro} style={styles.aiMacroItem}>
                              <Text style={styles.aiMacroLabel}>{macro.toUpperCase()}</Text>
                              <Text style={styles.aiMacroValue}>{Math.round(data.actual_avg || 0)}g</Text>
                              <Text style={[styles.aiMacroStatus, { color: statusColor }]}>{data.status}</Text>
                            </View>
                          );
                        })}
                      </View>
                      <Text style={styles.aiAnalysisText}>{aiAnalysisData.macro_analysis.analysis}</Text>
                    </View>
                  )}

                  {/* Omega-3 Analysis */}
                  {aiAnalysisData.omega3_analysis && (
                    <View style={styles.aiSection}>
                      <Text style={styles.aiSectionTitle}>🐟 Omega-3 Analysis</Text>
                      <View style={styles.aiScoreContainer}>
                        <Text style={[styles.aiScore, { borderColor: getScoreColor(aiAnalysisData.omega3_analysis.score) }]}>
                          {aiAnalysisData.omega3_analysis.score}/10
                        </Text>
                      </View>
                      <Text style={styles.aiAnalysisText}>{aiAnalysisData.omega3_analysis.analysis}</Text>
                      {aiAnalysisData.omega3_analysis.sources && aiAnalysisData.omega3_analysis.sources.length > 0 && (
                        <View style={styles.aiSourcesList}>
                          <Text style={styles.aiSourcesTitle}>Sources found:</Text>
                          {aiAnalysisData.omega3_analysis.sources.map((source, idx) => (
                            <Text key={idx} style={styles.aiSourceItem}>• {source}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Prebiotic Analysis */}
                  {aiAnalysisData.prebiotic_analysis && (
                    <View style={styles.aiSection}>
                      <Text style={styles.aiSectionTitle}>🌾 Prebiotic Fiber Analysis</Text>
                      <View style={styles.aiScoreContainer}>
                        <Text style={[styles.aiScore, { borderColor: getScoreColor(aiAnalysisData.prebiotic_analysis.score) }]}>
                          {aiAnalysisData.prebiotic_analysis.score}/10
                        </Text>
                      </View>
                      <Text style={styles.aiAnalysisText}>{aiAnalysisData.prebiotic_analysis.analysis}</Text>
                      {aiAnalysisData.prebiotic_analysis.sources && aiAnalysisData.prebiotic_analysis.sources.length > 0 && (
                        <View style={styles.aiSourcesList}>
                          <Text style={styles.aiSourcesTitle}>Sources found:</Text>
                          {aiAnalysisData.prebiotic_analysis.sources.map((source, idx) => (
                            <Text key={idx} style={styles.aiSourceItem}>• {source}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* NOVA Analysis */}
                  {aiAnalysisData.nova_analysis && (
                    <View style={styles.aiSection}>
                      <Text style={styles.aiSectionTitle}>🏭 NOVA Processing Score</Text>
                      <View style={styles.aiScoreContainer}>
                        <Text style={[styles.aiScore, { borderColor: getScoreColor(aiAnalysisData.nova_analysis.score) }]}>
                          {aiAnalysisData.nova_analysis.score}/10
                        </Text>
                      </View>
                      <Text style={styles.aiAnalysisText}>{aiAnalysisData.nova_analysis.analysis}</Text>
                    </View>
                  )}

                  {/* Overall Quality */}
                  {aiAnalysisData.overall_quality && (
                    <View style={[styles.aiSection, styles.aiOverallSection]}>
                      <Text style={styles.aiSectionTitle}>⭐ Overall Quality</Text>
                      <View style={styles.aiScoreContainer}>
                        <Text style={[styles.aiScore, styles.aiOverallScore, { borderColor: getScoreColor(aiAnalysisData.overall_quality.score) }]}>
                          {aiAnalysisData.overall_quality.score}/10
                        </Text>
                      </View>
                      <Text style={styles.aiAnalysisText}>{aiAnalysisData.overall_quality.analysis}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.aiEmptyState}>
                  <Text style={styles.aiEmptyText}>No analysis data available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Helper function for score colors
function getScoreColor(score) {
  if (score >= 8) return '#10b981'; // excellent - green
  if (score >= 6) return '#3b82f6'; // good - blue
  if (score >= 4) return '#f59e0b'; // fair - amber
  return '#ef4444'; // poor - red
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.background.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.secondary,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    // Dynamic color based on tab - orange for meals, green for ingredients
    backgroundColor: COLORS.accent.tertiary,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  activeTabIcon: {
    fontSize: 16,
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchIcon: {
    fontSize: 16,
    color: COLORS.text.tertiary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  addButton: {
    // Dynamic color set inline - orange for meals, green for ingredients
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  halfButton: {
    flex: 1,
    marginBottom: 0,
  },
  aiButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mealCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealHeader: {
    marginBottom: 12,
  },
  mealTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  calorieHighlight: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  calorieValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calorieLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
    opacity: 0.9,
  },
  badgesContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
  },
  badgeEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  mealNumber: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent.secondary + '20',
    borderColor: COLORS.accent.secondary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    gap: 4,
  },
  verifiedCheck: {
    fontSize: 12,
    color: COLORS.accent.secondary,
  },
  verifiedNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent.secondary,
  },
  verifiedLabel: {
    fontSize: 10,
    color: COLORS.accent.secondary,
    fontWeight: '600',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutritionBadge: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 3,
    position: 'relative',
  },
  nutritionIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nutritionIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  mealServing: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  mealActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  plannerContent: {
    gap: 16,
  },
  planCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 20,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  planSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  planControls: {
    flexDirection: 'row',
    backgroundColor: COLORS.border,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  planButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  activePlanButton: {
    backgroundColor: COLORS.accent.tertiary,
  },
  planButtonIcon: {
    fontSize: 14,
  },
  planButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  activePlanButtonText: {
    color: '#FFFFFF',
  },
  shoppingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.secondary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  shoppingButtonIcon: {
    fontSize: 16,
  },
  shoppingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fastingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E8B57',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  fastingIcon: {
    fontSize: 20,
  },
  fastingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  todayCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  todayInfo: {
    alignItems: 'center',
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent.tertiary,
  },
  todayDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dayCalories: {
    fontSize: 14,
    color: COLORS.accent.tertiary,
  },
  mealSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderStyle: 'dashed',
  },
  mealSlotLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  addMealButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addMealText: {
    fontSize: 14,
    color: COLORS.accent.tertiary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  weekInfo: {
    flex: 1,
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  weekSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  weeklyGrid: {
    marginBottom: 16,
  },
  dayColumn: {
    width: 140,
    marginRight: 12,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 12,
  },
  dayDate: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  mealSlotCard: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    minHeight: 70,
  },
  mealTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent.tertiary,
    marginBottom: 6,
  },
  assignedMeals: {
    gap: 6,
  },
  assignedMeal: {
    flex: 1,
    marginBottom: 4,
  },
  assignedMealName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  assignedMealCal: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  emptySlotText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  dailyView: {
    gap: 12,
  },
  dayCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dayCardDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  dayCardCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent.tertiary,
  },
  dailyMealSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.tertiary,
  },
  dailyMealType: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  dailyMealsContainer: {
    flex: 2,
    gap: 6,
  },
  dailyAssignedMeal: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  dailyMealName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dailyMealCal: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  dailyAddButton: {
    flex: 2,
    alignItems: 'flex-end',
  },
  dailyAddText: {
    fontSize: 14,
    color: COLORS.accent.tertiary,
    fontWeight: '500',
  },
  dailyAddMoreButton: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.accent.tertiary,
    borderStyle: 'dashed',
  },
  dailyAddMoreText: {
    fontSize: 12,
    color: COLORS.accent.tertiary,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  mealSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
  },
  mealSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalList: {
    maxHeight: 250,
    marginTop: 8,
  },
  modalMealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  modalMealName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  modalMealCal: {
    fontSize: 14,
    color: COLORS.accent.tertiary,
  },
  noResults: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  searchHint: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  searchHintText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    // Dynamic color set inline - orange for meals, green for ingredients
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  // AI Analysis Button
  aiAnalysisButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  aiAnalysisButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // AI Modal Styles
  aiModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  aiModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  aiModalContent: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aiModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiModalClose: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  aiPeriodToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 2,
    marginLeft: 12,
  },
  aiToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  aiToggleBtnActive: {
    backgroundColor: '#8b5cf6',
  },
  aiToggleBtnText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  aiToggleBtnTextActive: {
    color: '#FFFFFF',
  },
  aiModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  aiLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  aiLoadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 16,
  },
  aiSection: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  aiOverallSection: {
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  aiSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  aiComparisonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiComparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  aiComparisonLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  aiComparisonValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiMacroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiMacroItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  aiMacroLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginBottom: 4,
  },
  aiMacroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  aiMacroStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  aiScoreContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  aiScore: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    borderWidth: 3,
    borderRadius: 50,
    width: 80,
    height: 80,
    textAlign: 'center',
    lineHeight: 74,
  },
  aiOverallScore: {
    fontSize: 40,
    width: 100,
    height: 100,
    lineHeight: 94,
  },
  aiAnalysisText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  aiSourcesList: {
    marginTop: 12,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    padding: 12,
  },
  aiSourcesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  aiSourceItem: {
    fontSize: 13,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  aiEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  aiEmptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
});