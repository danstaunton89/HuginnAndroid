import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { ManualFoodEntryModal } from './ManualFoodEntry';
import { COLORS } from '../config/theme';
import { API_BASE_URL } from '../config/api';

// EXACT VALUES FROM YOUR WEB CSS modern-theme.css and modern-dashboard.css

const webColors = {
  // From :root in modern-theme.css
  primaryBlue: COLORS.accent.primary,
  primaryBlueLight: COLORS.accent.primary,
  pureWhite: '#FFFFFF',
  offWhite: '#FAFAFA',
  lightGray: '#F5F5F5',
  mediumGray: COLORS.text.primary,
  textGray: '#666666',
  darkGray: '#333333',

  // Dark theme from [data-theme="dark"]
  dark: {
    primaryBlue: COLORS.accent.primary,
    pureWhite: COLORS.background.black,
    offWhite: COLORS.background.primary,
    lightGray: COLORS.background.secondary,
    mediumGray: COLORS.background.tertiary,
    textGray: COLORS.text.secondary,
    darkGray: COLORS.text.primary,
  }
};

const webShadows = {
  // Exact shadows from modern-theme.css
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
};

export const ChatbotSection = ({ text, avatar = "🤖", showMoodScale, onMoodSelect }) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? webColors.dark : webColors;

  const moodEmojis = ['😞', '😔', '😐', '😊', '😄'];

  return (
    <View style={{
      // EXACT WEB DESIGN: Compact one-line chatbot from your screenshot
      backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)',
      borderWidth: 2,
      borderColor: isDarkMode ? 'rgba(107, 182, 255, 0.2)' : 'rgba(74, 144, 226, 0.15)',
      borderRadius: 12,
      paddingVertical: showMoodScale ? 12 : 8, // More padding when showing mood scale
      paddingHorizontal: 16, // --space-md
      marginBottom: 16, // Smaller margin
      minHeight: showMoodScale ? 72 : 56, // Taller when showing mood scale
      flexDirection: showMoodScale ? 'column' : 'row',
      alignItems: showMoodScale ? 'stretch' : 'center',
      justifyContent: showMoodScale ? 'center' : 'space-between',
      // Enhanced glass effect
      shadowColor: COLORS.accent.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    }}>
      {/* Text and avatar row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: showMoodScale ? 8 : 0,
      }}>
        {/* Avatar with GRADIENT like web app */}
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          // Linear gradient simulation with shadow
          backgroundColor: COLORS.accent.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
          // Enhanced blue shadow like web
          shadowColor: COLORS.accent.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: 18,
            color: "#FFFFFF",
          }}>
            {avatar}
          </Text>
        </View>

        <Text style={{
          fontSize: 14,
          color: COLORS.text.primary,
          fontWeight: '500',
          flex: 1,
          lineHeight: 18, // Tighter line height for compact design
        }}>
          {text}
        </Text>
      </View>

      {/* Mood scale */}
      {showMoodScale && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 4,
        }}>
          {moodEmojis.map((emoji, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => onMoodSelect && onMoodSelect(index + 1)}
              style={{
                backgroundColor: isDarkMode ? COLORS.background.tertiary : '#F5F5F5',
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isDarkMode ? '#444' : COLORS.text.primary,
              }}
            >
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export const MetricCard = ({ title, value, unit, isSelected, onPress, onAdd, icon, cardWidth }) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? webColors.dark : webColors;

  return (
    <TouchableOpacity
      style={{
        // Enhanced contrast and visibility
        backgroundColor: isDarkMode ? COLORS.background.tertiary : '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        minHeight: 85,
        width: cardWidth || '48%', // Apply width directly to the card
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected
          ? COLORS.accent.primary
          : (isDarkMode ? 'rgba(176, 176, 176, 0.2)' : 'rgba(224, 224, 224, 0.8)'),
        position: 'relative',
        overflow: 'hidden',
        // Enhanced shadows for better depth
        shadowColor: isSelected ? COLORS.accent.primary : '#000',
        shadowOffset: { width: 0, height: isSelected ? 6 : 3 },
        shadowOpacity: isSelected ? 0.15 : 0.08,
        shadowRadius: isSelected ? 12 : 6,
        elevation: isSelected ? 4 : 2,
        // Subtle background gradient effect
        ...(isSelected ? {
          shadowColor: COLORS.accent.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 6,
        } : {}),
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Top accent border when selected */}
      {isSelected && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: COLORS.accent.primary,
        }} />
      )}

      {/* Icon in top-left */}
      {icon && (
        <Text style={{
          position: 'absolute',
          top: 12,
          left: 12,
          fontSize: 16,
        }}>
          {icon}
        </Text>
      )}

      {/* Trend indicator in top-right */}
      <Text style={{
        position: 'absolute',
        top: 12,
        right: 40, // Leave space for + button
        fontSize: 10,
        color: COLORS.text.secondary,
        fontWeight: '500',
      }}>
        → 0%
      </Text>

      {/* Main value - centered */}
      <Text style={{
        fontSize: 24,
        fontWeight: '700',
        color: isSelected
          ? COLORS.accent.primary
          : (isDarkMode ? COLORS.text.primary : COLORS.text.primary),
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 4,
      }}>
        {value}
      </Text>

      {/* Title - bottom center */}
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        color: isSelected
          ? COLORS.accent.primary
          : (isDarkMode ? COLORS.text.secondary : COLORS.text.secondary),
        textAlign: 'center',
      }}>
        {title}
      </Text>

      {/* Enhanced add button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          backgroundColor: isSelected ? COLORS.accent.primary : (isDarkMode ? COLORS.accent.primary : COLORS.accent.secondary),
          borderRadius: 14, // Slightly larger
          width: 28, // Bigger
          height: 28, // Bigger
          justifyContent: 'center',
          alignItems: 'center',
          // Enhanced shadow for the button
          shadowColor: isSelected ? COLORS.accent.primary : (isDarkMode ? COLORS.accent.primary : COLORS.accent.secondary),
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 3,
        }}
        onPress={(e) => {
          e.stopPropagation();
          if (onAdd) onAdd();
        }}
        activeOpacity={0.7}
      >
        <Text style={{
          color: "#FFFFFF",
          fontSize: 18, // Slightly larger
          fontWeight: 'bold',
        }}>
          +
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const TabContainer = ({ activeTab, onTabPress }) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? webColors.dark : webColors;
  const tabs = ['Nutrition', 'Body', 'Wellness', 'Fitness'];

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: isDarkMode ? COLORS.background.primary : COLORS.background.secondary, // Light gray background
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
      ...webShadows.sm,
    }}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: activeTab.toLowerCase() === tab.toLowerCase()
              ? COLORS.accent.primary
              : (isDarkMode ? 'transparent' : '#FFFFFF'),
            shadowColor: activeTab.toLowerCase() === tab.toLowerCase() ? COLORS.accent.primary : '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: activeTab.toLowerCase() === tab.toLowerCase() ? 0.2 : 0.05,
            shadowRadius: activeTab.toLowerCase() === tab.toLowerCase() ? 4 : 2,
            elevation: activeTab.toLowerCase() === tab.toLowerCase() ? 2 : 1,
          }}
          onPress={() => onTabPress(tab.toLowerCase())}
          activeOpacity={0.7}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: activeTab.toLowerCase() === tab.toLowerCase() ? '600' : '500',
            color: activeTab.toLowerCase() === tab.toLowerCase() ? "#FFFFFF" : COLORS.text.secondary,
          }}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const QuickAddSection = ({ navigation, onFoodLogged }) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? webColors.dark : webColors;
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [todaysConsumption, setTodaysConsumption] = useState([]);
  const [searching, setSearching] = useState(false);

  // Load today's consumption on mount
  React.useEffect(() => {
    loadTodaysConsumption();
  }, []);

  const loadTodaysConsumption = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/food-consumption/today`, {
        headers
      });
      if (response.ok) {
        const data = await response.json();
        setTodaysConsumption(data);
      } else {
        setTodaysConsumption([]);
      }
    } catch (error) {
      console.error('Error loading today\'s consumption:', error);
      setTodaysConsumption([]);
    }
  };

  const removeFood = async (consumptionId) => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/food-consumption/${consumptionId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        console.log('Food removed');
        loadTodaysConsumption();
      }
    } catch (error) {
      console.error('Error removing food:', error);
    }
  };

  const searchIngredients = async (query) => {
    setSearching(true);
    try {
      console.log('Searching for:', query);
      console.log('API_BASE_URL:', API_BASE_URL);

      // Get auth token
      const authToken = await AsyncStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Search local ingredients
      const ingredientsResponse = await fetch(`${API_BASE_URL}/api/ingredients`, {
        headers
      });
      console.log('Ingredients response status:', ingredientsResponse.status);

      if (!ingredientsResponse.ok) {
        throw new Error(`Ingredients API failed: ${ingredientsResponse.status}`);
      }

      const allIngredients = await ingredientsResponse.json();
      console.log('All ingredients count:', allIngredients.length);

      // Search meals
      const mealsResponse = await fetch(`${API_BASE_URL}/api/meals`, {
        headers
      });
      console.log('Meals response status:', mealsResponse.status);

      if (!mealsResponse.ok) {
        throw new Error(`Meals API failed: ${mealsResponse.status}`);
      }

      const allMeals = await mealsResponse.json();
      console.log('All meals count:', allMeals.length);
      console.log('Sample meal:', allMeals[0]);

      // Filter local ingredients
      const filteredIngredients = allIngredients.filter(ing =>
        ing.name.toLowerCase().includes(query.toLowerCase())
      );
      console.log('Filtered ingredients:', filteredIngredients.length);

      // Filter meals
      const filteredMeals = allMeals.filter(meal =>
        meal.name.toLowerCase().includes(query.toLowerCase())
      );
      console.log('Filtered meals:', filteredMeals.length);

      // Format results
      let results = [];

      // Add meals first
      results.push(...filteredMeals.map(meal => ({
        id: meal.id,
        name: meal.name,
        calories: Math.round(meal.calories_per_serving || 0),
        protein: Math.round(meal.protein_per_serving || 0),
        carbs: Math.round(meal.carbs_per_serving || 0),
        fat: Math.round(meal.fat_per_serving || 0),
        type: 'meal',
        source: 'meals'
      })));

      // Add local ingredients
      results.push(...filteredIngredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fat: ing.fat,
        serving_size: ing.size,
        serving_unit: ing.size_unit,
        type: 'ingredient',
        source: 'local'
      })));

      console.log('Total results:', results.length);
      setSearchResults(results);
      setShowResults(true); // Always show results dropdown, even if empty
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', `Could not search: ${error.message}`);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!text.trim()) {
      setShowResults(false);
      setSearchResults([]);
      return;
    }

    // Debounce search
    const timeout = setTimeout(() => {
      searchIngredients(text.trim());
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleSelectResult = async (item) => {
    // Close search
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      if (item.type === 'meal') {
        // Log meal directly
        const response = await fetch(`${API_BASE_URL}/api/food-consumption`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            meal_id: item.id
          })
        });

        if (!response.ok) {
          throw new Error('Failed to log meal');
        }

        // Show success message (you can add Alert here if needed)
        console.log(`${item.name} logged successfully!`);

        // Reload food log
        loadTodaysConsumption();

        // Notify parent to refresh nutrition data
        if (onFoodLogged) {
          onFoodLogged();
        }

      } else {
        // For ingredients, log with default 100g portion
        const response = await fetch(`${API_BASE_URL}/api/food-log`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ingredient_id: item.id,
            quantity: 1, // 1x serving
            meal_type: getMealTypeByTime()
          })
        });

        if (!response.ok) {
          throw new Error('Failed to log ingredient');
        }

        console.log(`${item.name} logged successfully!`);

        // Reload food log
        loadTodaysConsumption();

        // Notify parent to refresh nutrition data
        if (onFoodLogged) {
          onFoodLogged();
        }
      }
    } catch (error) {
      console.error('Error logging item:', error);
      // You can add Alert.alert here for error notification
    }
  };

  const getMealTypeByTime = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 18) return 'snack';
    return 'dinner';
  };

  return (
    <>
      <ManualFoodEntryModal
        visible={manualModalVisible}
        onClose={() => setManualModalVisible(false)}
        onSuccess={() => {
          // Could trigger a refresh of the food log here if needed
        }}
      />

      <View style={{
      backgroundColor: COLORS.background.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      ...webShadows.md,
    }}>
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 16,
      }}>
        Quick Add Food
      </Text>

      <View style={{ position: 'relative' }}>
        <View style={{
          backgroundColor: COLORS.background.secondary,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 20,
          borderWidth: 2,
          borderColor: showResults ? COLORS.accent.primary : (isDarkMode ? 'rgba(107, 182, 255, 0.1)' : 'rgba(74, 144, 226, 0.1)'),
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            {searching ? (
              <ActivityIndicator size="small" color={COLORS.accent.primary} style={{ marginRight: 12 }} />
            ) : (
              <Text style={{
                fontSize: 16,
                marginRight: 12,
                color: COLORS.text.secondary,
              }}>
                🔍
              </Text>
            )}
            <TextInput
              style={{
                fontSize: 14,
                color: COLORS.text.primary,
                flex: 1,
                padding: 0,
              }}
              placeholder="Search meals, ingredients, or scan to add..."
              placeholderTextColor={COLORS.text.secondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Search Results */}
        {showResults && (
          <View style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            backgroundColor: COLORS.background.primary,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            maxHeight: 300,
            zIndex: 1000,
            ...webShadows.md,
          }}>
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled={true}>
              {/* No Results Message */}
              {searchResults.length === 0 && !searching && (
                <View style={{
                  padding: 24,
                  alignItems: 'center',
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: COLORS.text.secondary,
                    textAlign: 'center',
                  }}>
                    No meals or ingredients found for "{searchQuery}"
                  </Text>
                </View>
              )}

              {/* Your Meals */}
              {searchResults.filter(r => r.source === 'meals').length > 0 && (
                <>
                  <View style={{
                    backgroundColor: COLORS.background.secondary,
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: COLORS.text.primary,
                      textTransform: 'uppercase',
                    }}>
                      Your Meals
                    </Text>
                  </View>
                  {searchResults.filter(r => r.source === 'meals').map((item, index) => (
                    <TouchableOpacity
                      key={`meal-${index}`}
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onPress={() => handleSelectResult(item)}
                    >
                      <Text style={{
                        fontSize: 14,
                        color: COLORS.text.primary,
                        flex: 1,
                      }}>
                        🍽️ {item.name}
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        color: COLORS.text.secondary,
                      }}>
                        {item.calories} cal
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Your Ingredients */}
              {searchResults.filter(r => r.source === 'local').length > 0 && (
                <>
                  <View style={{
                    backgroundColor: COLORS.background.secondary,
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: COLORS.text.primary,
                      textTransform: 'uppercase',
                    }}>
                      Your Ingredients
                    </Text>
                  </View>
                  {searchResults.filter(r => r.source === 'local').map((item, index) => (
                    <TouchableOpacity
                      key={`ingredient-${index}`}
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onPress={() => handleSelectResult(item)}
                    >
                      <Text style={{
                        fontSize: 14,
                        color: COLORS.text.primary,
                        flex: 1,
                      }}>
                        🥕 {item.name}
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        color: COLORS.text.secondary,
                      }}>
                        {item.calories} cal per {item.serving_size}{item.serving_unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Action Boxes - Same as web app */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 12,
      }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: COLORS.background.secondary,
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            minHeight: 80,
            justifyContent: 'center',
          }}
          onPress={() => {
            if (navigation) {
              navigation.navigate('BarcodeScanner', {
                context: 'dashboard',
                returnScreen: 'Main'
              });
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={{
            fontSize: 24,
            marginBottom: 4,
          }}>
            📷
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#ffffff',
            fontWeight: '500',
          }}>
            Scan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: COLORS.background.secondary,
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            minHeight: 80,
            justifyContent: 'center',
          }}
          onPress={() => {
            // Coming soon
          }}
          activeOpacity={0.7}
        >
          <Text style={{
            fontSize: 24,
            marginBottom: 4,
          }}>
            ✨
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#ffffff',
            fontWeight: '500',
          }}>
            AI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: COLORS.background.secondary,
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            minHeight: 80,
            justifyContent: 'center',
          }}
          onPress={() => setManualModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={{
            fontSize: 24,
            marginBottom: 4,
          }}>
            ✏️
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#ffffff',
            fontWeight: '500',
          }}>
            Manual
          </Text>
        </TouchableOpacity>
      </View>

      <View>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: COLORS.text.primary,
          marginBottom: 12,
        }}>
          Today's Food Log
        </Text>

        {todaysConsumption.length === 0 ? (
          <View style={{
            backgroundColor: COLORS.background.secondary,
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}>
            <Text style={{
              fontSize: 14,
              color: COLORS.text.secondary,
              fontWeight: '500',
              marginBottom: 4,
            }}>
              No food logged today
            </Text>
            <Text style={{
              fontSize: 12,
              color: COLORS.text.secondary,
            }}>
              Search or scan to add food
            </Text>
          </View>
        ) : (
          <View style={{
            backgroundColor: COLORS.background.secondary,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}>
            {todaysConsumption.map((food, index) => {
              const time = new Date(food.consumed_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              });

              // Handle different food name formats
              let foodName = food.meal_name || food.ingredient_name || food.name || 'Unknown food';

              // If it's a "Single:" prefixed name, clean it up
              if (foodName.startsWith('Single: ')) {
                foodName = foodName.replace('Single: ', '');
              }

              const calories = Math.round(food.total_calories || food.calories || 0);

              return (
                <View
                  key={food.id || index}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 12,
                    borderBottomWidth: index < todaysConsumption.length - 1 ? 1 : 0,
                    borderBottomColor: COLORS.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: COLORS.text.primary,
                      marginBottom: 2,
                    }}>
                      {foodName}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: COLORS.text.secondary,
                    }}>
                      {time}
                    </Text>
                  </View>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <Text style={{
                      fontSize: 14,
                      color: COLORS.text.secondary,
                    }}>
                      {calories} cal
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFood(food.id)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: COLORS.background.tertiary,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{
                        fontSize: 16,
                        color: COLORS.text.secondary,
                        fontWeight: '600',
                      }}>
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
    </>
  );
};

export const TrendsSection = ({ selectedMetric, chartPeriod, onPeriodPress, chartData, chartLoading, chartContent }) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? webColors.dark : webColors;

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: COLORS.text.primary,
          textTransform: 'capitalize',
        }}>
          {selectedMetric ? `${selectedMetric} Trends` : 'Trends'}
        </Text>

        <View style={{
          flexDirection: 'row',
          backgroundColor: 'transparent', // Remove background entirely
          borderRadius: 8,
          padding: 2,
          gap: 4, // Add small gap between buttons
        }}>
          {['week', 'month', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: chartPeriod === period
                  ? COLORS.accent.primary
                  : (isDarkMode ? 'rgba(44, 44, 44, 0.8)' : '#FFFFFF'),
                borderWidth: chartPeriod === period ? 0 : 1,
                borderColor: isDarkMode ? 'rgba(176, 176, 176, 0.2)' : 'rgba(224, 224, 224, 0.6)',
                shadowColor: chartPeriod === period ? COLORS.accent.primary : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: chartPeriod === period ? 0.25 : 0.08,
                shadowRadius: chartPeriod === period ? 6 : 3,
                elevation: chartPeriod === period ? 3 : 1,
              }}
              onPress={() => onPeriodPress(period)}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: chartPeriod === period ? "#FFFFFF" : COLORS.text.secondary,
                textTransform: 'capitalize',
              }}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{
        backgroundColor: COLORS.background.primary,
        borderRadius: 12,
        padding: selectedMetric && chartData ? 16 : 24,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: selectedMetric && chartData ? 'auto' : 200,
        ...webShadows.md,
      }}>
        {selectedMetric ? (
          <View style={{ alignItems: 'center', width: '100%' }}>
            {chartLoading ? (
              <Text style={{
                fontSize: 14,
                color: COLORS.text.secondary,
                textAlign: 'center',
              }}>
                Loading chart...
              </Text>
            ) : chartData ? (
              <View style={{ width: '100%' }}>
                {chartContent}
              </View>
            ) : (
              <Text style={{
                fontSize: 14,
                color: COLORS.text.secondary,
                textAlign: 'center',
              }}>
                No data available
              </Text>
            )}
          </View>
        ) : (
          <Text style={{
            fontSize: 14,
            color: COLORS.text.secondary,
            textAlign: 'center',
          }}>
            Tap a metric card to view trends
          </Text>
        )}
      </View>
    </View>
  );
};

export const SyncBanner = ({ syncStatus, refreshing }) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? webColors.dark : webColors;

  if (!syncStatus) return null;

  return (
    <View style={{
      backgroundColor: COLORS.accent.primary,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...webShadows.md,
    }}>
      <Text style={{
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
      }}>
        {syncStatus}
      </Text>
      {refreshing && (
        <View style={{
          marginLeft: 12,
          width: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: 'bold',
          }}>
            ⟳
          </Text>
        </View>
      )}
    </View>
  );
};