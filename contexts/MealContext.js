import React, { createContext, useContext, useState } from 'react';

const MealContext = createContext();

export const useMeal = () => {
  const context = useContext(MealContext);
  if (!context) {
    throw new Error('useMeal must be used within a MealProvider');
  }
  return context;
};

export const MealProvider = ({ children }) => {
  const [currentMeal, setCurrentMeal] = useState({
    name: '',
    ingredients: [],
    totalNutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    },
    servings: 1,
    notes: ''
  });

  const addIngredient = (ingredient) => {
    setCurrentMeal(prev => {
      const newIngredients = [...prev.ingredients, ingredient];

      // Calculate new total nutrition
      const newTotalNutrition = newIngredients.reduce((acc, ing) => {
        acc.calories += ing.calories || 0;
        acc.protein += ing.protein || 0;
        acc.carbs += ing.carbs || 0;
        acc.fat += ing.fat || 0;
        acc.fiber += ing.fiber || 0;
        acc.sugar += ing.sugar || 0;
        acc.sodium += ing.sodium || 0;
        return acc;
      }, {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0
      });

      return {
        ...prev,
        ingredients: newIngredients,
        totalNutrition: newTotalNutrition
      };
    });
  };

  const removeIngredient = (index) => {
    setCurrentMeal(prev => {
      const newIngredients = prev.ingredients.filter((_, i) => i !== index);

      // Recalculate total nutrition
      const newTotalNutrition = newIngredients.reduce((acc, ing) => {
        acc.calories += ing.calories || 0;
        acc.protein += ing.protein || 0;
        acc.carbs += ing.carbs || 0;
        acc.fat += ing.fat || 0;
        acc.fiber += ing.fiber || 0;
        acc.sugar += ing.sugar || 0;
        acc.sodium += ing.sodium || 0;
        return acc;
      }, {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0
      });

      return {
        ...prev,
        ingredients: newIngredients,
        totalNutrition: newTotalNutrition
      };
    });
  };

  const updateMealName = (name) => {
    setCurrentMeal(prev => ({
      ...prev,
      name
    }));
  };

  const updateServings = (servings) => {
    setCurrentMeal(prev => ({
      ...prev,
      servings
    }));
  };

  const resetMeal = () => {
    setCurrentMeal({
      name: '',
      ingredients: [],
      totalNutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0
      },
      servings: 1,
      notes: ''
    });
  };

  const loadMeal = (mealData) => {
    // Calculate total nutrition from ingredients
    const totalNutrition = mealData.ingredients?.reduce((acc, ing) => {
      acc.calories += ing.calories || 0;
      acc.protein += ing.protein || 0;
      acc.carbs += ing.carbs || 0;
      acc.fat += ing.fat || 0;
      acc.fiber += ing.fiber || 0;
      acc.sugar += ing.sugar || 0;
      acc.sodium += ing.sodium || 0;
      return acc;
    }, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    }) || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    };

    setCurrentMeal({
      id: mealData.id,
      name: mealData.name || '',
      ingredients: mealData.ingredients || [],
      totalNutrition,
      servings: mealData.servings || 1,
      notes: mealData.notes || ''
    });
  };

  const updateIngredient = (index, updatedIngredient) => {
    setCurrentMeal(prev => {
      const newIngredients = [...prev.ingredients];
      newIngredients[index] = updatedIngredient;

      // Recalculate total nutrition
      const newTotalNutrition = newIngredients.reduce((acc, ing) => {
        acc.calories += ing.calories || 0;
        acc.protein += ing.protein || 0;
        acc.carbs += ing.carbs || 0;
        acc.fat += ing.fat || 0;
        acc.fiber += ing.fiber || 0;
        acc.sugar += ing.sugar || 0;
        acc.sodium += ing.sodium || 0;
        return acc;
      }, {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0
      });

      return {
        ...prev,
        ingredients: newIngredients,
        totalNutrition: newTotalNutrition
      };
    });
  };

  const value = {
    currentMeal,
    addIngredient,
    updateIngredient,
    removeIngredient,
    updateMealName,
    updateServings,
    resetMeal,
    loadMeal
  };

  return (
    <MealContext.Provider value={value}>
      {children}
    </MealContext.Provider>
  );
};