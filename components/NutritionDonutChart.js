import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const NutritionDonutChart = ({
  protein = 0,
  carbs = 0,
  fat = 0,
  proteinTarget = 150,
  carbsTarget = 200,
  fatTarget = 65,
  size = 280,
  strokeWidth = 35,
  isDarkMode = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentages
  const proteinPercent = Math.min((protein / proteinTarget) * 100, 100);
  const carbsPercent = Math.min((carbs / carbsTarget) * 100, 100);
  const fatPercent = Math.min((fat / fatTarget) * 100, 100);

  // Animated values
  const proteinProgress = useSharedValue(0);
  const carbsProgress = useSharedValue(0);
  const fatProgress = useSharedValue(0);
  const totalCaloriesValue = useSharedValue(0);

  useEffect(() => {
    // Animate each ring with staggered timing for a cascading effect
    proteinProgress.value = withTiming(proteinPercent, {
      duration: 1200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    setTimeout(() => {
      carbsProgress.value = withTiming(carbsPercent, {
        duration: 1200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }, 200);

    setTimeout(() => {
      fatProgress.value = withTiming(fatPercent, {
        duration: 1200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }, 400);

    // Animate total calories
    const totalCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    totalCaloriesValue.value = withSpring(totalCalories, {
      damping: 15,
      stiffness: 100,
    });
  }, [protein, carbs, fat, proteinTarget, carbsTarget, fatTarget]);

  // Protein ring (outermost)
  const proteinAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (proteinProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  // Carbs ring (middle)
  const carbsAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (carbsProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  // Fat ring (innermost)
  const fatAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (fatProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  const totalCalories = (protein * 4) + (carbs * 4) + (fat * 9);
  const targetCalories = (proteinTarget * 4) + (carbsTarget * 4) + (fatTarget * 9);

  const centerX = size / 2;
  const centerY = size / 2;

  // Layer radii
  const proteinRadius = radius;
  const carbsRadius = radius - strokeWidth - 8;
  const fatRadius = radius - (strokeWidth * 2) - 16;

  const proteinCircumference = 2 * Math.PI * proteinRadius;
  const carbsCircumference = 2 * Math.PI * carbsRadius;
  const fatCircumference = 2 * Math.PI * fatRadius;

  // Colors
  const proteinColor = '#FF6B35';  // Orange
  const carbsColor = '#4ECDC4';    // Teal
  const fatColor = '#FFE66D';      // Yellow
  const backgroundColor = isDarkMode ? '#2C2C2C' : '#F0F0F0';

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circles */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={proteinRadius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={centerX}
          cy={centerY}
          r={carbsRadius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={centerX}
          cy={centerY}
          r={fatRadius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Protein ring (outermost) */}
        <AnimatedCircle
          cx={centerX}
          cy={centerY}
          r={proteinRadius}
          stroke={proteinColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={proteinCircumference}
          strokeDashoffset={proteinCircumference}
          strokeLinecap="round"
          rotation="-90"
          origin={`${centerX}, ${centerY}`}
          animatedProps={proteinAnimatedProps}
        />

        {/* Carbs ring (middle) */}
        <AnimatedCircle
          cx={centerX}
          cy={centerY}
          r={carbsRadius}
          stroke={carbsColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={carbsCircumference}
          strokeDashoffset={carbsCircumference}
          strokeLinecap="round"
          rotation="-90"
          origin={`${centerX}, ${centerY}`}
          animatedProps={carbsAnimatedProps}
        />

        {/* Fat ring (innermost) */}
        <AnimatedCircle
          cx={centerX}
          cy={centerY}
          r={fatRadius}
          stroke={fatColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={fatCircumference}
          strokeDashoffset={fatCircumference}
          strokeLinecap="round"
          rotation="-90"
          origin={`${centerX}, ${centerY}`}
          animatedProps={fatAnimatedProps}
        />

        {/* Center text */}
        <SvgText
          x={centerX}
          y={centerY - 10}
          fontSize="36"
          fontWeight="bold"
          fill={isDarkMode ? '#E0E0E0' : '#2C2C2C'}
          textAnchor="middle"
        >
          {Math.round(totalCalories)}
        </SvgText>
        <SvgText
          x={centerX}
          y={centerY + 20}
          fontSize="14"
          fill={isDarkMode ? '#999999' : '#666666'}
          textAnchor="middle"
        >
          / {targetCalories} kcal
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: proteinColor }]} />
          <Text style={[styles.legendText, isDarkMode && styles.legendTextDark]}>
            Protein: {protein}g / {proteinTarget}g
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: carbsColor }]} />
          <Text style={[styles.legendText, isDarkMode && styles.legendTextDark]}>
            Carbs: {carbs}g / {carbsTarget}g
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: fatColor }]} />
          <Text style={[styles.legendText, isDarkMode && styles.legendTextDark]}>
            Fat: {fat}g / {fatTarget}g
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  legend: {
    marginTop: 30,
    width: '100%',
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: '#2C2C2C',
    fontWeight: '500',
  },
  legendTextDark: {
    color: '#E0E0E0',
  },
});

export default NutritionDonutChart;
