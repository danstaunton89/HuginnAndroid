import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Dimensions, RefreshControl, Alert, StatusBar, Platform, Modal, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart, StackedBarChart, PieChart } from 'react-native-chart-kit';
import { MetricCard, ChatbotSection, TabContainer, QuickAddSection, TrendsSection, SyncBanner } from '../components/WebStyleCard';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';
import BMIChart from '../components/BMIChart';
import ConfettiCannon from 'react-native-confetti-cannon';

export default function DashboardScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('nutrition');
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);

  // Create dynamic styles based on dark mode state
  const styles = createStyles(isDarkMode);
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('week'); // 'week', 'month', or 'year'
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(''); // For showing sync messages
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const syncSuccessAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef(null);
  const [chatbotState, setChatbotState] = useState({
    text: 'Good morning! How are you feeling today? 😊',
    showMoodScale: true,
    currentFlow: 'mood'
  });
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [metricsData, setMetricsData] = useState({
    nutrition: {
      bmr: { value: 0, unit: 'cal/day', icon: '🔥', apiEndpoint: '/api/user/profile' }, // flame icon
      fiber: { value: 0, unit: 'g', icon: '🌾', apiEndpoint: '/api/meals/nutrition/today' }, // wheat icon
      upf: { value: 0, unit: '%', icon: '⚠️', apiEndpoint: '/api/meals/nutrition/today' }, // warning icon
      // Hidden metrics for chart functionality (rendered in pie chart)
      calories: { value: 0, unit: 'cal', icon: '🔥', apiEndpoint: '/api/meals/nutrition/today', hidden: true },
      protein: { value: 0, unit: 'g', icon: '👤', apiEndpoint: '/api/meals/nutrition/today', hidden: true },
      carbs: { value: 0, unit: 'g', icon: '🌾', apiEndpoint: '/api/meals/nutrition/today', hidden: true },
      fat: { value: 0, unit: 'g', icon: '💧', apiEndpoint: '/api/meals/nutrition/today', hidden: true }
    },
    body: {
      weight: { value: 0, unit: 'kg', icon: '⚖️', apiEndpoint: '/api/body-composition/latest' }, // scale icon
      bmi: { value: 0, unit: '', icon: '👤', apiEndpoint: '/api/body-composition/latest' }, // body icon
      // Hidden metrics for chart functionality (rendered in pie chart)
      'body-fat': { value: 0, unit: '%', icon: '%', apiEndpoint: '/api/body-composition/latest', hidden: true },
      'muscle-mass': { value: 0, unit: '%', icon: '💪', apiEndpoint: '/api/body-composition/latest', hidden: true },
      'water-percentage': { value: 0, unit: '%', icon: '💧', apiEndpoint: '/api/body-composition/latest', hidden: true }
    },
    wellness: {
      sleep: { value: 0, unit: 'hrs', icon: '🌙', apiEndpoint: '/api/sleep/latest' }, // moon icon
      mood: { value: 0, unit: '/5', icon: '😊', apiEndpoint: '/api/mood/today' }, // smile icon
      stress: { value: 0, unit: '/10', icon: '🧠', apiEndpoint: '/api/mood/today' }, // brain icon
      hydration: { value: 0, unit: 'glasses', icon: '💧', apiEndpoint: '/api/water/today' } // water icon
    },
    fitness: {
      steps: { value: 0, unit: 'steps', icon: '⏰', apiEndpoint: '/api/steps/today' }, // footsteps (using clock as circle substitute)
      active: { value: 0, unit: 'min', icon: '📈', apiEndpoint: '/api/exercise/today' }, // activity (line chart)
      'calories-burned': { value: 0, unit: 'cal', icon: '🔥', apiEndpoint: '/api/exercise/today' }, // fire icon
      'heart-rate': { value: 0, unit: 'bpm', icon: '❤️', apiEndpoint: '/api/heart-rate/today' }, // heart icon
      'blood-pressure': { value: '0/0', unit: 'mmHg', icon: '📊', apiEndpoint: '/api/bloodpressure/latest' } // pulse (using chart)
    }
  });

  // Load metrics data when component mounts or tab changes
  useEffect(() => {
    loadMetricsForTab(activeTab);
  }, [activeTab]);

  // Initialize chatbot once on mount
  useEffect(() => {
    initializeChatbot();
  }, []);

  const loadMetricsForTab = async (tab) => {
    setLoading(true);
    const metrics = metricsData[tab];
    const updatedMetrics = { ...metrics };

    try {
      // Load real data from your APIs
      for (const [metricId, metricData] of Object.entries(metrics)) {
        try {
          // Try to fetch real data from API
          const realData = await fetchRealData(metricId, metricData.apiEndpoint);

          if (realData === 'calculate_bmi') {
            // Calculate BMI from weight and height
            const bmiValue = await calculateBMI();
            updatedMetrics[metricId] = { ...metricData, value: bmiValue };
          } else if (realData === 'calculate_bmr') {
            // Calculate BMR from weight, height, age, and sex
            const bmrValue = await calculateBMR();
            updatedMetrics[metricId] = { ...metricData, value: bmrValue };
          } else {
            updatedMetrics[metricId] = { ...metricData, value: realData };
          }
        } catch (error) {
          // Keep default value of 0 - no fake data fallback
          updatedMetrics[metricId] = { ...metricData, value: 0 };
        }
      }

      setMetricsData(prevData => ({
        ...prevData,
        [tab]: updatedMetrics
      }));
    } catch (error) {
      // Error handling
    }
    setLoading(false);
  };

  const calculateBMI = async () => {
    try {
      // Get user height from profile API
      const authToken = await AsyncStorage.getItem('authToken');
      const profileResponse = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!profileResponse.ok) {
        return 0;
      }

      const profileData = await profileResponse.json();
      const height = profileData.success && profileData.data ? profileData.data.height : null;

      // Get current weight from body composition API (most recent regardless of source)
      const weightResponse = await fetch(`${API_BASE_URL}/api/body-composition/latest`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      let weight = 0;
      if (weightResponse.ok) {
        const weightData = await weightResponse.json();
        weight = weightData.success && weightData.data ? parseFloat(weightData.data.weight) : 0;
      }

      if (height && weight && height > 0 && weight > 0) {
        // BMI = weight(kg) / height(m)²
        // Height is stored in cm, convert to meters
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);
        return Math.round(bmi * 10) / 10; // Round to 1 decimal place
      }

      return 0;
    } catch (error) {
      return 0;
    }
  };

  const calculateBMR = async () => {
    try {
      // Get user profile data (height, age, sex)
      const authToken = await AsyncStorage.getItem('authToken');
      const profileResponse = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!profileResponse.ok) {
        return 0;
      }

      const profileData = await profileResponse.json();
      if (!profileData.success || !profileData.data) {
        return 0;
      }

      const height = profileData.data.height;
      const dateOfBirth = profileData.data.date_of_birth;
      const sex = profileData.data.sex;

      // Get current weight from body composition API
      const weightResponse = await fetch(`${API_BASE_URL}/api/body-composition/latest`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      let weight = 0;
      if (weightResponse.ok) {
        const weightData = await weightResponse.json();
        weight = weightData.success && weightData.data ? parseFloat(weightData.data.weight) : 0;
      }

      // Check if we have all required data
      if (!height || !weight || !dateOfBirth || !sex || height <= 0 || weight <= 0) {
        return 0;
      }

      // Calculate age from date of birth
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

      // Calculate BMR using Mifflin-St Jeor Equation
      // Men: BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age) + 5
      // Women: BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age) − 161
      let bmr;
      if (sex === 'M' || sex === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      }

      return Math.round(bmr);
    } catch (error) {
      return 0;
    }
  };

  const processBodyCompositionMulti = async (data, period = 'week') => {
    try {
      let chartPoints = [];

      // Process different API response formats
      if (Array.isArray(data)) {
        chartPoints = data.map(item => ({
          date: new Date(item.measured_at),
          fatValue: parseFloat(item.fat_percentage || 0),
          muscleValue: parseFloat(item.muscle_percentage || 0),
          waterValue: parseFloat(item.water_percentage || 0)
        }));
      } else if (data.success && Array.isArray(data.data)) {
        chartPoints = data.data.map(item => ({
          date: new Date(item.measured_at),
          fatValue: parseFloat(item.fat_percentage || 0),
          muscleValue: parseFloat(item.muscle_percentage || 0),
          waterValue: parseFloat(item.water_percentage || 0)
        }));
      }

      // Deduplicate by date - keep latest measurement per day
      const dailyData = {};
      chartPoints.forEach(point => {
        const dateKey = point.date.toISOString().split('T')[0];
        if (!dailyData[dateKey] || dailyData[dateKey].date < point.date) {
          dailyData[dateKey] = point;
        }
      });

      // Convert back to array and sort
      chartPoints = Object.values(dailyData).sort((a, b) => a.date - b.date);

      // Take appropriate number of days
      const dayCount = period === 'year' ? 365 : (period === 'month' ? 30 : 7);
      let recent = chartPoints.slice(-dayCount);

      // For year view, group by month
      if (period === 'year') {
        const monthGroups = {};

        if (recent.length > 0) {
          const earliestDate = recent[0].date;
          const latestDate = recent[recent.length - 1].date;

          let currentMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
          const endMonth = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);

          while (currentMonth <= endMonth) {
            const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            monthGroups[monthKey] = {
              date: new Date(currentMonth),
              fatValues: [],
              muscleValues: [],
              waterValues: []
            };
            currentMonth.setMonth(currentMonth.getMonth() + 1);
          }
        }

        // Fill in data points
        recent.forEach(point => {
          const monthKey = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`;
          if (monthGroups[monthKey]) {
            if (point.fatValue > 0) monthGroups[monthKey].fatValues.push(point.fatValue);
            if (point.muscleValue > 0) monthGroups[monthKey].muscleValues.push(point.muscleValue);
            if (point.waterValue > 0) monthGroups[monthKey].waterValues.push(point.waterValue);
          }
        });

        // Calculate averages
        recent = Object.values(monthGroups).map(month => ({
          date: month.date,
          fatValue: month.fatValues.length > 0
            ? month.fatValues.reduce((sum, val) => sum + val, 0) / month.fatValues.length
            : 0,
          muscleValue: month.muscleValues.length > 0
            ? month.muscleValues.reduce((sum, val) => sum + val, 0) / month.muscleValues.length
            : 0,
          waterValue: month.waterValues.length > 0
            ? month.waterValues.reduce((sum, val) => sum + val, 0) / month.waterValues.length
            : 0
        })).sort((a, b) => a.date - b.date);
      }

      if (recent.length === 0) {
        return null;
      }

      // Format labels
      const formatDateLabel = (date, period) => {
        if (period === 'year') {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return monthNames[date.getMonth()];
        } else if (period === 'month') {
          return `${date.getDate()}`;
        } else {
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }
      };

      // Use bar chart for week, line chart for month/year (matching desktop)
      const useBarChart = period === 'week';

      return {
        labels: recent.map(point => formatDateLabel(point.date, period)),
        datasets: [
          {
            data: recent.map(point => Math.round(point.fatValue * 10) / 10),
            color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`, // Orange #FF6B35
            strokeWidth: useBarChart ? 0 : 3,
            withDots: !useBarChart
          },
          {
            data: recent.map(point => Math.round(point.muscleValue * 10) / 10),
            color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`, // Teal #4ECDC4
            strokeWidth: useBarChart ? 0 : 3,
            withDots: !useBarChart
          },
          {
            data: recent.map(point => Math.round(point.waterValue * 10) / 10),
            color: (opacity = 1) => `rgba(93, 173, 226, ${opacity})`, // Blue #5DADE2
            strokeWidth: useBarChart ? 0 : 3,
            withDots: !useBarChart
          }
        ],
        chartType: useBarChart ? 'body-composition-bar' : 'body-composition-line',
        legend: ['Body Fat', 'Muscle Mass', 'Water']
      };
    } catch (error) {
      return null;
    }
  };

  const fetchChartData = async (metricId, period = 'week') => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');

      // Special handling for body composition metrics - fetch all three together
      if (['body-fat', 'muscle-mass', 'water-percentage'].includes(metricId)) {
        const endpoint = '/api/body-composition/history';
        const urlWithParams = period === 'year'
          ? `${API_BASE_URL}${endpoint}?period=year&limit=365`
          : `${API_BASE_URL}${endpoint}`;

        const response = await fetch(urlWithParams, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          return await processBodyCompositionMulti(data, period);
        }
        throw new Error(`Body composition API request failed: ${response.status}`);
      }

      // Map metrics to their historical API endpoints based on period
      const getEndpoint = (metricId, period) => {
        const baseEndpoints = {
          // Body metrics - use full history endpoints for year view
          'weight': `/api/weight/converted?period=${period}`,
          'bmi': `/api/body-composition/history?period=${period}`, // Use raw weight data (always in kg) for BMI calculation
          'body-fat': '/api/body-composition/history', // Always use history for body composition
          'muscle-mass': '/api/body-composition/history',
          'water-percentage': '/api/body-composition/history',

          // Wellness metrics - use full history endpoints for year view
          'sleep': period === 'year' ? '/api/sleep/history' : '/api/sleep/last30days',
          'mood': period === 'year' ? '/api/mood/history' : '/api/mood/last30days',
          'hydration': period === 'year' ? '/api/water' : '/api/water/last30days', // Note: may need to check if /api/water returns full history

          // Fitness metrics - use full history endpoints for year view
          'steps': period === 'year' ? '/api/steps/history' : '/api/steps/last30days',
          'active': period === 'year' ? '/api/exercise/history' : '/api/exercise/last30days',
          'calories-burned': period === 'year' ? '/api/exercise/history' : '/api/exercise/last30days',
          'heart-rate': '/api/heart-rate/history', // Always use history
          'blood-pressure': period === 'year' ? '/api/bloodpressure' : '/api/blood-pressure/last30days' // Use /api/bloodpressure for full history
        };
        return baseEndpoints[metricId];
      };

      const endpoint = getEndpoint(metricId, period);
      if (!endpoint) {
        throw new Error(`No chart endpoint for ${metricId}`);
      }

      // Add period parameter for year requests to ensure full data
      const urlWithParams = period === 'year'
        ? `${API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}period=year&limit=365`
        : `${API_BASE_URL}${endpoint}`;

      const response = await fetch(urlWithParams, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();

        if (period === 'year') {
          const dataArray = Array.isArray(data) ? data : data.data || [];
          if (dataArray.length > 0) {
            const dates = dataArray.map(item => item.date || item.recorded_at || item.measured_at).filter(Boolean);
          }
        }

        const chartData = await processChartData(metricId, data, period);

        // Preserve display unit for weight and BMI metrics
        if (metricId === 'weight' || metricId === 'bmi') {
          if (data.display_unit) {
            chartData.displayUnit = data.display_unit;
          }
        }

        return chartData;
      }

      throw new Error(`Chart API request failed: ${response.status}`);
    } catch (error) {
      throw error;
    }
  };

  const processChartData = async (metricId, data, period = 'week') => {
    try {
      let chartPoints = [];

      // Fetch user height if we're processing BMI data
      let userHeight = null;
      if (metricId === 'bmi') {
        try {
          const authToken = await AsyncStorage.getItem('authToken');
          const profileResponse = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            userHeight = profileData.success && profileData.data ? profileData.data.height : null;
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // Process different API response formats
      if (Array.isArray(data)) {
        chartPoints = data.map(item => ({
          date: new Date(item.date || item.recorded_at || item.measured_at),
          value: extractMetricValue(metricId, item, userHeight),
          rawData: item // Include raw data for sleep stages
        }));
      } else if (data.success && Array.isArray(data.data)) {
        chartPoints = data.data.map(item => ({
          date: new Date(item.date || item.recorded_at || item.measured_at),
          value: extractMetricValue(metricId, item, userHeight),
          rawData: item // Include raw data for sleep stages
        }));
      }

      // Sort by date and take appropriate number of days
      chartPoints.sort((a, b) => a.date - b.date);
      const dayCount = period === 'year' ? 365 : (period === 'month' ? 30 : 7);
      let recent = chartPoints.slice(-dayCount);

      // For year view, group by month and calculate averages (like web app)
      if (period === 'year') {
        const monthGroups = {};

        // If we have data, use data-driven month range; otherwise use standard 12 months
        if (recent.length > 0) {
          // Create month groups based on actual data range
          const earliestDate = recent[0].date;
          const latestDate = recent[recent.length - 1].date;

          // Create groups for each month in the data range
          const startMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
          const endMonth = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);

          let currentMonth = new Date(startMonth);
          while (currentMonth <= endMonth) {
            const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            monthGroups[monthKey] = {
              date: new Date(currentMonth),
              values: [],
              rawDataPoints: [] // Store raw data for sleep stages
            };
            currentMonth.setMonth(currentMonth.getMonth() + 1);
          }
        } else {
          // Fallback: Create entries for the past 12 months if no data
          const currentDate = new Date();
          for (let i = 11; i >= 0; i--) {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            monthGroups[monthKey] = {
              date: monthDate,
              values: [],
              rawDataPoints: []
            };
          }
        }

        // Fill in actual data points
        recent.forEach(point => {
          const monthKey = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`;
          if (monthGroups[monthKey]) {
            // Include all data points, not just those with value > 0
            if (point.value >= 0) { // Allow 0 values
              monthGroups[monthKey].values.push(point.value);
            }
            if (point.rawData) {
              monthGroups[monthKey].rawDataPoints.push(point.rawData);
            }
          }
        });

        // Calculate monthly averages
        recent = Object.values(monthGroups)
          .map(month => {
            if (month.values.length === 0) {
              return {
                date: month.date,
                value: 0,
                rawData: null
              };
            }

            // For sleep stages, average the stage data too
            let avgRawData = null;
            if (month.rawDataPoints.length > 0 && month.rawDataPoints[0].deep_minutes !== undefined) {
              const totalPoints = month.rawDataPoints.length;
              avgRawData = {
                deep_minutes: Math.round(month.rawDataPoints.reduce((sum, p) => sum + (p.deep_minutes || 0), 0) / totalPoints),
                light_minutes: Math.round(month.rawDataPoints.reduce((sum, p) => sum + (p.light_minutes || 0), 0) / totalPoints),
                rem_minutes: Math.round(month.rawDataPoints.reduce((sum, p) => sum + (p.rem_minutes || 0), 0) / totalPoints),
                awake_minutes: Math.round(month.rawDataPoints.reduce((sum, p) => sum + (p.awake_minutes || 0), 0) / totalPoints)
              };
            }

            return {
              date: month.date,
              value: month.values.reduce((sum, val) => sum + val, 0) / month.values.length,
              rawData: avgRawData
            };
          })
          .sort((a, b) => a.date - b.date);

        const monthsWithData = recent.filter(m => m.value > 0).length;
      } else if (period === 'month' && recent.length > 12) {
        // Better sampling for month view - take every 2-3 days to prevent overlap
        const sampleRate = recent.length > 20 ? 3 : 2;
        recent = recent.filter((_, index) => index % sampleRate === 0);
      }

      if (recent.length === 0) {
        return null;
      }

      // Determine chart type
      const useBarChart = ['steps', 'calories-burned', 'calories', 'active'].includes(metricId);
      const useSleepStages = metricId === 'sleep';

      // Format labels based on period
      const formatDateLabel = (date, period) => {
        if (period === 'year') {
          // For year view, show month names like web app
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return monthNames[date.getMonth()];
        } else if (period === 'month') {
          return `${date.getDate()}`; // Just day number
        } else {
          return `${date.getMonth() + 1}/${date.getDate()}`; // "9/26"
        }
      };

      // Special handling for sleep stages stacked chart
      if (useSleepStages && metricId === 'sleep') {
        return processSleepStagesChart(recent, period, formatDateLabel);
      }

      // Special handling for BMI with range bands
      if (metricId === 'bmi') {
        return processBMIChart(recent, period, formatDateLabel, useBarChart);
      }

      // Format for react-native-chart-kit
      return {
        labels: recent.map(point => formatDateLabel(point.date, period)),
        datasets: [{
          data: recent.map(point => point.value || 0),
          color: (opacity = 1) => `rgba(13, 211, 211, ${opacity})`, // Primary blue
          strokeWidth: 2
        }],
        chartType: useBarChart ? 'bar' : 'line',
        metricId: metricId // Pass metricId for target fetching later
      };
    } catch (error) {
      return null;
    }
  };

  const processSleepStagesChart = (recent, period, formatDateLabel) => {
    try {
      // Check if we have meaningful sleep stage data
      const hasGoodStageData = recent.some(point =>
        point.rawData &&
        point.rawData.deep_minutes > 0 &&
        point.rawData.light_minutes > 0 &&
        (point.rawData.deep_minutes + point.rawData.light_minutes +
         (point.rawData.rem_minutes || 0) + (point.rawData.awake_minutes || 0)) > 60
      );

      // If no good stage data, fall back to clean total sleep duration bar chart
      if (!hasGoodStageData) {
        return {
          labels: recent.map(point => formatDateLabel(point.date, period)),
          datasets: [{
            data: recent.map(point => Math.round(point.value * 10) / 10), // Round to 1 decimal
            color: (opacity = 1) => `rgba(13, 211, 211, ${opacity})`,
            strokeWidth: 2
          }],
          chartType: 'bar'
        };
      }

      // Filter to only include entries with complete stage data
      const stageData = recent.filter(point =>
        point.rawData &&
        point.rawData.deep_minutes > 0 &&
        point.rawData.light_minutes > 0 &&
        (point.rawData.deep_minutes + point.rawData.light_minutes +
         (point.rawData.rem_minutes || 0) + (point.rawData.awake_minutes || 0)) > 60
      );

      if (stageData.length === 0) {
        // Fallback to simple bar chart
        return {
          labels: recent.map(point => formatDateLabel(point.date, period)),
          datasets: [{
            data: recent.map(point => Math.round(point.value * 10) / 10),
            color: (opacity = 1) => `rgba(13, 211, 211, ${opacity})`,
            strokeWidth: 2
          }],
          chartType: 'bar'
        };
      }

      // Create clean stacked bar chart data
      const labels = stageData.map(point => formatDateLabel(point.date, period));

      // Convert to hours and round to 1 decimal place for cleaner display
      const roundToDecimal = (minutes) => Math.round((minutes / 60) * 10) / 10;

      const chartData = stageData.map(point => [
        roundToDecimal(point.rawData.deep_minutes || 0),    // Deep sleep
        roundToDecimal(point.rawData.light_minutes || 0),   // Light sleep
        roundToDecimal(point.rawData.rem_minutes || 0),     // REM sleep
        roundToDecimal(point.rawData.awake_minutes || 0)    // Awake time
      ]);

      return {
        labels: labels,
        // Remove legend to use custom one instead
        data: chartData,
        barColors: [
          COLORS.accent.tertiary,  // Dark teal for deep sleep
          COLORS.accent.primary,   // Main teal for light sleep
          COLORS.accent.secondary, // Mint teal for REM sleep
          COLORS.accent.light      // Light teal for awake time
        ],
        chartType: 'stacked'
      };
    } catch (error) {
      return null;
    }
  };

  const processBMIChart = (recent, period, formatDateLabel, useBarChart) => {
    try {
      if (recent.length === 0) {
        return null;
      }

      const labels = recent.map(point => formatDateLabel(point.date, period));
      const bmiValues = recent.map(point => Math.round((point.value || 0) * 10) / 10); // Round to 1 decimal

      // Ensure BMI values are within reasonable range and remove zeros
      const validBMIValues = bmiValues.map(val => val > 0 ? Math.min(val, 50) : null);
      const maxBMI = Math.max(...validBMIValues.filter(val => val !== null));
      const minBMI = Math.min(...validBMIValues.filter(val => val !== null));

      // Set fixed scale from 15 to 35 to match web app
      const chartMin = 15;
      const chartMax = 35;

      // Simplified: just show BMI data with colored dataset for each zone
      // Color the actual BMI line based on which zone it falls into
      const coloredBMIData = validBMIValues.map(val => {
        if (val === null || val === 0) return { value: 0, color: 'rgba(13, 211, 211, 1)' };
        if (val < 18.5) return { value: val, color: 'rgba(96, 165, 250, 1)' }; // Blue
        if (val < 25) return { value: val, color: 'rgba(34, 197, 94, 1)' }; // Green
        if (val < 30) return { value: val, color: 'rgba(245, 158, 11, 1)' }; // Amber
        return { value: val, color: 'rgba(239, 68, 68, 1)' }; // Red
      });

      return {
        labels: labels,
        datasets: [
          {
            data: validBMIValues.map(val => val || 0),
            color: (opacity = 1) => `rgba(13, 211, 211, ${opacity})`, // Turquoise
            strokeWidth: 3,
            withDots: true
          }
        ],
        // Store range info for background rendering - same as web app
        bmiRanges: {
          underweight: 18.5,
          normal: 24.9,
          overweight: 29.9,
          chartMin: chartMin,
          chartMax: chartMax,
          actualMin: minBMI,
          actualMax: maxBMI
        },
        chartType: 'bmi-ranges'
      };
    } catch (error) {
      return null;
    }
  };

  const getDecimalPlaces = (metricId) => {
    // Match web app rounding patterns
    switch (metricId) {
      case 'steps':
      case 'calories-burned':
      case 'active':
        return 0; // Whole numbers (Math.round)
      case 'sleep':
      case 'weight':
      case 'bmi':
      case 'body-fat':
      case 'muscle-mass':
      case 'water-percentage':
      case 'heart-rate':
      case 'mood':
      case 'hydration':
        return 1; // One decimal place (.toFixed(1))
      default:
        return 1;
    }
  };

  const extractMetricValue = (metricId, dataItem, userHeight = null) => {
    let value;
    switch (metricId) {
      case 'weight':
        value = parseFloat(dataItem.weight || 0);
        break;
      case 'bmi':
        // Calculate BMI properly: weight(kg) / height(m)²
        const weight = parseFloat(dataItem.weight || 0);
        if (userHeight && userHeight > 0 && weight > 0) {
          const heightInMeters = userHeight / 100; // Convert cm to meters
          value = weight / (heightInMeters * heightInMeters);
        } else {
          value = 0;
        }
        break;
      case 'body-fat':
        value = parseFloat(dataItem.fat_percentage || dataItem.body_fat_percentage || 0);
        break;
      case 'muscle-mass':
        value = parseFloat(dataItem.muscle_percentage || dataItem.muscle_mass_percentage || 0);
        break;
      case 'water-percentage':
        value = parseFloat(dataItem.water_percentage || dataItem.body_water_percentage || 0);
        break;
      case 'sleep':
        const totalMinutes = parseFloat(dataItem.duration_minutes || 0);
        const awakeMinutes = parseFloat(dataItem.awake_minutes || 0);
        value = (totalMinutes - awakeMinutes) / 60; // Actual sleep time
        break;
      case 'mood':
        value = parseFloat(dataItem.mood_value || 0);
        break;
      case 'steps':
        value = parseFloat(dataItem.steps || dataItem.step_count || 0);
        break;
      case 'active':
        value = parseFloat(dataItem.duration_minutes || dataItem.active_minutes || 0);
        break;
      case 'calories-burned':
        value = parseFloat(dataItem.calories_burned || dataItem.calories || 0);
        break;
      case 'heart-rate':
        value = parseFloat(dataItem.resting_heart_rate || dataItem.heart_rate || dataItem.avg_heart_rate || 0);
        break;
      case 'blood-pressure':
        value = parseFloat(dataItem.systolic || 0);
        break;
      case 'hydration':
        value = parseFloat(dataItem.water_amount || dataItem.amount || 0) / 250; // Convert to glasses
        break;
      default:
        value = parseFloat(dataItem.value || 0);
    }

    // Apply appropriate rounding to match web app
    const decimalPlaces = getDecimalPlaces(metricId);
    if (decimalPlaces === 0) {
      return Math.round(value);
    } else {
      return Math.round(value * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
    }
  };

  const fetchRealData = async (metricId, endpoint) => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const parsedValue = parseApiResponse(metricId, data);
        return parsedValue;
      }

      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status}`);
    } catch (error) {
      throw error;
    }
  };

  const parseApiResponse = (metricId, data) => {
    // Parse different API response formats
    switch (metricId) {
      case 'weight':
        return data.success && data.data ? parseFloat(data.data.weight) : 0;
      case 'bmi':
        // BMI calculation will be handled separately since we need both weight and height
        return 'calculate_bmi'; // Special flag to trigger BMI calculation
      case 'bmr':
        // BMR calculation will be handled separately since we need weight, height, age, and sex
        return 'calculate_bmr'; // Special flag to trigger BMR calculation
      case 'body-fat':
        return data.success && data.data ? data.data.fat_percentage : 0;
      case 'muscle-mass':
        return data.success && data.data ? data.data.muscle_percentage : 0;
      case 'water-percentage':
        return data.success && data.data ? data.data.water_percentage : 0;
      case 'calories':
        return Math.round(data.totalcalories || 0);
      case 'protein':
        return Math.round(data.totalprotein || 0);
      case 'carbs':
        return Math.round(data.totalcarbs || 0);
      case 'fat':
        return Math.round(data.totalfat || 0);
      case 'fiber':
        return Math.round(data.totalfiber || 0);
      case 'upf':
        // Calculate UPF percentage from NOVA scores
        const totalCalories = data.totalcalories || 0;
        const novaCalories = data.nova_calories || {};
        const upfCalories = (novaCalories['4'] || 0); // NOVA 4 = ultra-processed
        return totalCalories > 0 ? Math.round((upfCalories / totalCalories) * 100) : 0;
      case 'sleep':
        // Sleep API returns raw database row, calculate actual sleep time (same as web app)
        if (data && data.duration_minutes) {
          const totalMinutes = parseFloat(data.duration_minutes);
          const awakeMinutes = parseFloat(data.awake_minutes || 0);
          const actualSleepMinutes = totalMinutes - awakeMinutes;
          return Math.round((actualSleepMinutes / 60) * 10) / 10; // Convert to hours, round to 1 decimal
        }
        return 0;
      case 'mood':
        // Mood API returns array
        return Array.isArray(data) && data.length > 0 ?
          data.reduce((sum, m) => sum + m.mood_value, 0) / data.length : 0;
      case 'stress':
        // Stress is same as mood for now
        return Array.isArray(data) && data.length > 0 ?
          data.reduce((sum, m) => sum + (m.stress_level || 3), 0) / data.length : 0;
      case 'hydration':
        // Water API returns {total_ml: 2000} format
        return data && data.total_ml ? data.total_ml / 250 : 0; // Convert ml to glasses (250ml per glass)
      case 'steps':
        // Steps API returns {steps: 8432} format
        return data && data.steps ? parseInt(data.steps) : 0;
      case 'active':
        // Exercise API returns wrapped response with total_duration
        return data.success && data.data ? data.data.total_duration || 0 : 0;
      case 'calories-burned':
        // Exercise API returns wrapped response with total_calories
        return data.success && data.data ? data.data.total_calories || 0 : 0;
      case 'heart-rate':
        // Heart rate API returns wrapped response
        return data.success && data.data ? data.data.avg_heart_rate || data.data.resting_heart_rate : 0;
      case 'blood-pressure':
        return data.success && data.data ?
          `${data.data.systolic}/${data.data.diastolic}` : '0/0';
      default:
        return data.value || data || 0;
    }
  };

  // Sample data for development - replace with real API calls
  const getSampleData = (metricId) => {
    const sampleValues = {
      // Nutrition
      calories: 1847,
      protein: 89,
      carbs: 203,
      fat: 67,
      fiber: 28,

      // Body
      weight: 75.2,
      bmi: 22.1,
      'body-fat': 15.8,
      'muscle-mass': 42.3,
      'water-percentage': 58.7,

      // Wellness
      sleep: 7.5,
      mood: 4,
      stress: 3,
      hydration: 6,

      // Fitness
      steps: 8432,
      active: 45,
      'calories-burned': 2184,
      'heart-rate': 72,
      'blood-pressure': '120/80'
    };

    return sampleValues[metricId] || 0;
  };

  const showBMRActivityLevels = () => {
    // Get the current BMR value from metricsData
    const currentBMR = metricsData.body.bmr.value;

    if (!currentBMR || currentBMR === 0) {
      Alert.alert(
        'BMR Not Available',
        'BMR not calculated yet. Please ensure your weight, height, age, and sex are set in settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Calculate activity level multipliers
    const activityLevels = [
      {
        name: 'Sedentary',
        description: "You're inactive and do little or no exercise per day.",
        calories: Math.round(currentBMR * 1.2)
      },
      {
        name: 'Lightly Active',
        description: "You're getting the steps in and do light exercise 1-3 times a week.",
        calories: Math.round(currentBMR * 1.375)
      },
      {
        name: 'Moderately Active',
        description: "You like to break a sweat and do moderate exercise 4-5 times a week.",
        calories: Math.round(currentBMR * 1.55)
      },
      {
        name: 'Very Active',
        description: "You're more hare than tortoise and do hard exercise 6-7 times a week.",
        calories: Math.round(currentBMR * 1.725)
      },
      {
        name: 'Extra Active',
        description: "You're seriously pushing for the burn and do intense exercise every day.",
        calories: Math.round(currentBMR * 1.9)
      }
    ];

    const message = `Your BMR: ${currentBMR} cal/day\n\nDaily Calorie Needs by Activity Level:\n\n${activityLevels.map(level =>
      `${level.name}: ${level.calories} cal\n${level.description}`
    ).join('\n\n')}\n\nNote: These are estimates based on your BMR. To maintain your current weight, consume the calories shown for your activity level.`;

    Alert.alert('Daily Calorie Needs', message, [{ text: 'OK' }], { cancelable: true });
  };

  const showUPFFoods = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/food/upf-foods`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          const upfList = result.data.map(item =>
            `• ${item.name} (${Math.round(item.total_calories)} cal)\n  from ${item.meal_name}`
          ).join('\n\n');

          const totalUpfCalories = result.data.reduce((sum, item) => sum + parseFloat(item.total_calories || 0), 0);

          Alert.alert(
            'Ultra-Processed Foods Today',
            `You consumed ${result.data.length} ultra-processed food(s) totaling ${Math.round(totalUpfCalories)} calories:\n\n${upfList}`,
            [{ text: 'OK' }],
            { cancelable: true }
          );
        } else {
          Alert.alert(
            'Ultra-Processed Foods',
            'Great job! You haven\'t consumed any ultra-processed foods today. 🎉',
            [{ text: 'OK' }],
            { cancelable: true }
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to load ultra-processed foods data');
    }
  };

  const handleMetricPress = async (metricId) => {
    // Check if this is BMR - show activity levels modal instead
    if (metricId === 'bmr') {
      showBMRActivityLevels();
      return;
    }

    // Check if this is UPF - show list of UPF foods instead of chart
    if (metricId === 'upf') {
      showUPFFoods();
      return;
    }

    setSelectedMetric(metricId);

    // Update chatbot to show metric selection
    const metricLabels = {
      'weight': 'Weight',
      'bmi': 'BMI',
      'bmr': 'BMR',
      'upf': 'Ultra-Processed Foods',
      'calories': 'Calories',
      'protein': 'Protein',
      'carbs': 'Carbs',
      'fat': 'Fat',
      'fiber': 'Fiber',
      'steps': 'Steps',
      'hydration': 'Water',
      'sleep': 'Sleep',
      'mood': 'Mood',
      'body-fat': 'Body Fat',
      'muscle-mass': 'Muscle Mass',
      'water-percentage': 'Body Water',
      'heart-rate': 'Heart Rate',
      'blood-pressure': 'Blood Pressure',
      'active': 'Active Minutes',
      'calories-burned': 'Calories Burned'
    };

    const label = metricLabels[metricId] || metricId;
    setChatbotState({
      text: `Loading ${label} trends...`,
      showMoodScale: false,
      currentFlow: null
    });

    await loadChartData(metricId, chartPeriod);
  };

  const handlePeriodPress = async (period) => {
    setChartPeriod(period);
    if (selectedMetric) {
      setChartLoading(true); // Show loading immediately
      await loadChartData(selectedMetric, period);
    }
  };

  const loadChartData = async (metricId, period) => {
    setChartLoading(true);

    try {
      // Fetch historical data for the selected metric
      const chartData = await fetchChartData(metricId, period);

      // Fetch target value for applicable metrics and add to chart
      // Note: Sleep uses stacked bar chart so target line won't work the same way
      const targetMetrics = ['weight', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'steps', 'hydration', 'sleep'];

      // Map metric IDs to target API endpoints
      const targetEndpointMap = {
        'weight': 'ideal_weight',
        'calories': 'calories',
        'protein': 'protein',
        'carbs': 'carbs',
        'fat': 'fat',
        'fiber': 'fiber',
        'steps': 'steps',
        'hydration': 'water',
        'sleep': 'sleep'
      };

      // Fetch targets for all chart types, not just line charts
      if (chartData && targetMetrics.includes(metricId)) {
        try {
          const authToken = await AsyncStorage.getItem('authToken');
          const targetEndpoint = targetEndpointMap[metricId] || metricId;
          const targetResponse = await fetch(`${API_BASE_URL}/api/targets/${targetEndpoint}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });

          if (targetResponse.ok) {
            const targetData = await targetResponse.json();
            if (targetData && targetData.target_value) {
              let targetValue = parseFloat(targetData.target_value);

              // Convert water target from ml to glasses
              if (metricId === 'hydration') {
                targetValue = targetValue / 250;
              }

              // Convert weight target from kg to display unit if needed
              if (metricId === 'weight' && chartData.displayUnit) {
                // Targets are ALWAYS stored in kg in database
                if (chartData.displayUnit === 'lbs') {
                  targetValue = targetValue * 2.20462; // kg to lbs
                } else if (chartData.displayUnit === 'stone') {
                  targetValue = targetValue / 6.35029; // kg to stone
                }
                // If display unit is kg, no conversion needed
              }

              // Ensure target value is valid
              if (targetValue > 0 && !isNaN(targetValue)) {
                // Store target value for decorator rendering
                chartData.targetValue = targetValue;
                chartData.hasTarget = true;

                // Also add as a dataset for compatibility (though it might not render properly)
                if (chartData.datasets.length === 1) {
                  chartData.datasets.push({
                    data: new Array(chartData.labels.length).fill(targetValue),
                    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity * 0.7})`, // Green for target
                    strokeWidth: 2,
                    withDots: false
                  });
                }
              }
            }
          }
        } catch (err) {
          // Ignore target fetch errors
        }
      }

      setChartData(chartData);

      // Update chatbot with target info if available
      const metricLabels = {
        'weight': 'Weight',
        'bmi': 'BMI',
        'upf': 'Ultra-Processed Foods',
        'calories': 'Calories',
        'protein': 'Protein',
        'carbs': 'Carbs',
        'fat': 'Fat',
        'fiber': 'Fiber',
        'steps': 'Steps',
        'hydration': 'Water',
        'sleep': 'Sleep',
        'mood': 'Mood',
        'body-fat': 'Body Fat',
        'muscle-mass': 'Muscle Mass',
        'water-percentage': 'Body Water',
        'heart-rate': 'Heart Rate',
        'blood-pressure': 'Blood Pressure',
        'active': 'Active Minutes',
        'calories-burned': 'Calories Burned'
      };

      const label = metricLabels[metricId] || metricId;
      let message = `Viewing ${label} trends for the last ${period}.`;

      // Add target info if we have it
      if (chartData && chartData.targetValue) {
        // Handle different chart structures
        let currentValue;
        if (chartData.chartType === 'stacked' && chartData.data) {
          // For stacked sleep chart, sum all sleep stages (exclude awake time which is last)
          const lastDataPoint = chartData.data[chartData.data.length - 1];
          if (lastDataPoint) {
            // Sum deep, light, and REM sleep (indices 0, 1, 2) - exclude awake (index 3)
            currentValue = lastDataPoint[0] + lastDataPoint[1] + lastDataPoint[2];
          }
        } else if (chartData.datasets && chartData.datasets[0]) {
          // For regular charts
          const dataset = chartData.datasets[0];
          const dataValues = dataset.data || [];
          currentValue = dataValues[dataValues.length - 1];
        }

        const targetValue = chartData.targetValue;

        // Only show target info if we have both current and target values
        if (currentValue !== undefined && currentValue !== null && targetValue !== undefined && targetValue !== null) {
          // Format values based on metric type
          const formatValue = (val, metric) => {
            if (['weight', 'bmi', 'body-fat', 'muscle-mass', 'water-percentage', 'sleep'].includes(metric)) {
              return val.toFixed(1);
            } else if (['calories', 'protein', 'carbs', 'fat', 'fiber', 'steps', 'calories-burned', 'active'].includes(metric)) {
              return Math.round(val);
            } else if (metric === 'hydration') {
              return `${val.toFixed(1)} glasses`;
            }
            return val.toFixed(1);
          };

          const current = formatValue(currentValue, metricId);
          const target = formatValue(targetValue, metricId);
          const difference = currentValue - targetValue;
          const percentDiff = Math.abs((difference / targetValue) * 100).toFixed(1);

          if (metricId === 'weight') {
            // Use the actual display unit from the API response
            const unit = chartData.displayUnit || 'kg';
            if (difference > 0) {
              message += ` Current: ${current}${unit}. Target: ${target}${unit}. You're ${Math.abs(difference).toFixed(1)}${unit} above your target.`;
            } else {
              message += ` Current: ${current}${unit}. Target: ${target}${unit}. Great job! You're within range of your target!`;
            }
          } else if (metricId === 'sleep') {
            // Sleep-specific messaging
            if (currentValue && targetValue) {
              const sleepDiff = currentValue - targetValue;
              if (Math.abs(sleepDiff) < 0.1) {
                message += ` You're hitting your sleep target of ${target} hours! 😴`;
              } else if (sleepDiff >= 0) {
                message += ` Great! You're getting ${current} hours of sleep. Target: ${target} hours. ✨`;
              } else {
                message += ` Current: ${current} hours. Target: ${target} hours. Try to get ${Math.abs(sleepDiff).toFixed(1)} more hours of sleep. 💤`;
              }
            }
          } else {
            if (difference < 0) {
              message += ` Current: ${current}. Target: ${target}. You're ${percentDiff}% below target.`;
            } else {
              message += ` Current: ${current}. Target: ${target}. Excellent! You're meeting your target!`;
            }
          }
        }
      }

      setChatbotState({
        text: message,
        showMoodScale: false,
        currentFlow: null
      });
    } catch (error) {
      setChartData(null);
      setChatbotState({
        text: `Unable to load chart data. Please try again.`,
        showMoodScale: false,
        currentFlow: null
      });
    }

    setChartLoading(false);
    };

  const showCelebration = (celebration) => {
    if (!celebration || !celebration.celebrate) {
      return;
    }

    // Trigger confetti
    if (confettiRef.current) {
      confettiRef.current.start();
    }

    // Show modal after a short delay (let confetti start first)
    setTimeout(() => {
      setCelebrationData(celebration);
      setShowCelebrationModal(true);
    }, 300);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      setShowCelebrationModal(false);
    }, 10000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setSyncStatus('🔄 Syncing with devices...');

    try {
      const authToken = await AsyncStorage.getItem('authToken');

      // Step 1: Check what devices are connected
      setSyncStatus('📡 Checking connected devices...');
      const statusResponse = await fetch(`${API_BASE_URL}/api/sync/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check device status');
      }

      const status = await statusResponse.json();

      if (status.totalConnected === 0) {
        setSyncStatus('No devices connected');
        Alert.alert('No Devices', 'No devices connected. Go to Settings to connect your devices.');
        setSyncStatus('');
        setRefreshing(false);
        return;
      }

      // Step 2: Use centralized sync endpoint (faster than individual calls)
      setSyncStatus(`⚡ Syncing ${status.totalConnected} device(s)...`);
      const syncResponse = await fetch(`${API_BASE_URL}/api/sync/all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!syncResponse.ok) {
        throw new Error('Sync request failed');
      }

      const syncResult = await syncResponse.json();

      // Step 3: Refresh dashboard data with new synced data
      setSyncStatus('📱 Updating dashboard...');
      await loadMetricsForTab(activeTab);

      // Refresh chart if metric is selected
      if (selectedMetric) {
        await loadChartData(selectedMetric, chartPeriod);
      }

      // Step 4: Check for goal celebrations
      try {
        const celebrationResponse = await fetch(`${API_BASE_URL}/api/celebrations/pending`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (celebrationResponse.ok) {
          const celebrationData = await celebrationResponse.json();
          if (celebrationData.success && celebrationData.celebrations && celebrationData.celebrations.length > 0) {
            // Show celebration for the most recent achievement
            const celebration = celebrationData.celebrations[0];
            showCelebration(celebration);
          }
        }
      } catch (celebrationError) {
        // Silent fail - celebrations are nice-to-have
      }

      const itemCount = syncResult.totalItems || 0;
      const deviceCount = syncResult.totalDevices || 0;
      setSyncStatus(`✅ Synced ${itemCount} items from ${deviceCount} device(s)`);

      // Show success animation
      setShowSyncSuccess(true);
      Animated.sequence([
        Animated.timing(syncSuccessAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(syncSuccessAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSyncSuccess(false);
      });

      // Clear sync status after a moment
      setTimeout(() => {
        setSyncStatus('');
      }, 2500);

    } catch (error) {
      setSyncStatus('❌ Sync failed');
      Alert.alert('Sync Error', 'Failed to sync with devices. Please check your connections and try again.');

      // Even on error, try to refresh local data
      try {
        await loadMetricsForTab(activeTab);
        if (selectedMetric) {
          await loadChartData(selectedMetric, chartPeriod);
        }
      } catch (refreshError) {
        }

      // Clear error message after a moment
      setTimeout(() => {
        setSyncStatus('');
      }, 3000);
    }

    setRefreshing(false);
    setLastRefreshTime(new Date());
  };

  const initializeChatbot = async () => {
    try {
      // Check AsyncStorage for today's interactions
      const today = new Date().toDateString();
      const storedInteractions = await AsyncStorage.getItem('healthtracker_interactions');
      const interactions = storedInteractions ? JSON.parse(storedInteractions) : {};
      const todayInteractions = interactions[today] || {};

      // Check if dismissed recently (within 3 hours)
      const dismissedUntil = await AsyncStorage.getItem('chatbot_dismissed_until');
      if (dismissedUntil && new Date() < new Date(dismissedUntil)) {
        setChatbotState({
          text: 'Taking a break from check-ins... 😌',
          showMoodScale: false,
          currentFlow: null
        });
        return;
      }

      // Check if mood already recorded today (locally or from API)
      if (todayInteractions.mood) {
        // Mood already recorded, check for other missing metrics
        checkForMissingMetrics();
        return;
      }

      // Show mood check-in
      const hour = new Date().getHours();
      let greeting = 'Good evening! How are you feeling tonight? 🌙';
      if (hour < 12) greeting = 'Good morning! How are you feeling today? 😊';
      else if (hour < 17) greeting = 'Good afternoon! How are you feeling today? 🌟';

      setChatbotState({
        text: greeting,
        showMoodScale: true,
        currentFlow: 'mood'
      });
    } catch (error) {
      // Fallback to basic greeting
      setChatbotState({
        text: 'Good morning! How are you feeling today? 😊',
        showMoodScale: true,
        currentFlow: 'mood'
      });
    }
  };

  const getCalorieGoal = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/calorie-goal`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const goal = result.data;
          const targetCal = goal.target_calories;
          const weeklyChange = parseFloat(goal.weekly_loss_goal_kg);

          let goalType = '';
          let emoji = '';
          if (Math.abs(weeklyChange) < 0.01) {
            goalType = 'maintaining';
            emoji = '⚖️';
          } else if (weeklyChange > 0) {
            goalType = `gaining ${Math.abs(weeklyChange).toFixed(1)} kg/week`;
            emoji = '📈';
          } else {
            goalType = `losing ${Math.abs(weeklyChange).toFixed(1)} kg/week`;
            emoji = '📉';
          }

          return {
            message: `${emoji} Your daily calorie goal is ${targetCal} cal/day (${goalType})`,
            targetCalories: targetCal,
            weeklyChange: weeklyChange
          };
        }
      }
    } catch (error) {
      // Error handled silently
    }
    return null;
  };

  const checkForMissingMetrics = async () => {
    // Check if it's been over an hour since last refresh
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const shouldShowRefreshHint = !lastRefreshTime || lastRefreshTime < oneHourAgo;

    if (shouldShowRefreshHint) {
      const hour = now.getHours();
      let refreshMessage = "💡 Tip: Pull down to refresh your latest health data! 📊";

      if (hour < 12) {
        refreshMessage = "Good morning! 🌅 Pull down to sync your latest data! 💫";
      } else if (hour < 17) {
        refreshMessage = "📱 Pull down to refresh and see your latest health data! ✨";
      } else {
        refreshMessage = "🌙 End of day refresh - pull down to sync all your data! 🔄";
      }

      setChatbotState({
        text: refreshMessage,
        showMoodScale: false,
        currentFlow: 'refresh_hint'
      });
      return;
    }

    // Check for calorie goal and display it
    const calorieGoal = await getCalorieGoal();
    if (calorieGoal) {
      setChatbotState({
        text: calorieGoal.message,
        showMoodScale: false,
        currentFlow: null
      });
      return;
    }

    // For now, show encouragement message
    setChatbotState({
      text: "You're doing great with your health tracking! 👏 Keep it up!",
      showMoodScale: false,
      currentFlow: null
    });
  };

  const saveTodaysInteraction = async (type, value) => {
    try {
      const today = new Date().toDateString();
      const storedInteractions = await AsyncStorage.getItem('healthtracker_interactions');
      const interactions = storedInteractions ? JSON.parse(storedInteractions) : {};

      if (!interactions[today]) {
        interactions[today] = {};
      }

      interactions[today][type] = value;
      await AsyncStorage.setItem('healthtracker_interactions', JSON.stringify(interactions));
    } catch (error) {
      // Error handling
    }
  };

  const setDismissedUntil = async (hours = 3) => {
    try {
      const dismissUntil = new Date();
      dismissUntil.setHours(dismissUntil.getHours() + hours);
      await AsyncStorage.setItem('chatbot_dismissed_until', dismissUntil.toISOString());
    } catch (error) {
      // Error handling
    }
  };

  const handleWeightEntry = () => {
    setWeightInput('');
    setShowWeightModal(true);
  };

  const saveWeight = async () => {
    if (!weightInput || isNaN(parseFloat(weightInput))) {
      Alert.alert('Invalid Input', 'Please enter a valid weight value');
      return;
    }

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/body-composition`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weight: parseFloat(weightInput),
          weight_unit: 'kg',
          data_source: 'manual'
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Close modal
        setShowWeightModal(false);

        // Show success message
        let message = 'Weight logged successfully!';

        // Check if calorie goal was auto-recalculated
        if (result.calorie_recalculated && result.recalculation_message) {
          message = result.recalculation_message;
        }

        Alert.alert('Success', message);

        // Refresh body metrics
        await loadMetricsForTab('body');

        // Refresh chart if weight is selected
        if (selectedMetric === 'weight') {
          await loadChartData('weight', chartPeriod);
        }
      } else {
        Alert.alert('Error', 'Failed to log weight. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to log weight. Please try again.');
    }
  };

  const handleMoodSelection = async (mood) => {
    const moodEmojis = ['', '😞', '😔', '😐', '😊', '😄'];
    const moodLabels = ['', 'Very Low', 'Low', 'Okay', 'Good', 'Great'];

    setChatbotState({
      text: `${moodEmojis[mood]} ${moodLabels[mood]} (${mood}/5)`,
      showMoodScale: false,
      currentFlow: null
    });

    // Save mood to database
    try {
      const response = await fetch(`${API_BASE_URL}/api/mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mood_value: mood,
          notes: 'Mood check-in via mobile app'
        })
      });

      // Save interaction locally regardless of API success
      await saveTodaysInteraction('mood', mood);

      if (response.ok) {
        // Show encouragement based on mood
        let encouragement = '';
        if (mood <= 2) {
          encouragement = "I hear you. 💙 Take care of yourself today - maybe focus on gentle nutrition?";
        } else if (mood === 3) {
          encouragement = "Thanks for sharing! 🌟 Some good nutrition might help lift your spirits today.";
        } else if (mood === 4) {
          encouragement = "That's wonderful! 😊 You're in a great headspace to tackle your health goals!";
        } else {
          encouragement = "Amazing energy! 🎉 Keep that momentum going with your health tracking!";
        }

        setTimeout(() => {
          setChatbotState({
            text: encouragement,
            showMoodScale: false,
            currentFlow: null
          });

          // After encouragement, check for other missing metrics
          setTimeout(() => {
            checkForMissingMetrics();
          }, 3000);
        }, 2000);

        // Refresh mood data if on wellness tab
        if (activeTab === 'wellness') {
          loadMetricsForTab('wellness');
        }
      } else {
        // Even if API fails, save locally and show encouragement
        setTimeout(() => {
          setChatbotState({
            text: "Thanks for sharing your mood! 😊",
            showMoodScale: false,
            currentFlow: null
          });
        }, 2000);
      }
    } catch (error) {
      // Error handling
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! Ready to start your day?';
    if (hour < 17) return 'Good afternoon! How are you feeling today?';
    return 'Good evening! Time to wind down.';
  };


  const renderMetricsForTab = () => {
    const metrics = metricsData[activeTab];
    const metricLabels = {
      nutrition: {
        calories: 'Calories',
        protein: 'Protein',
        carbs: 'Carbs',
        fat: 'Fat',
        fiber: 'Fiber'
      },
      body: {
        weight: 'Weight',
        bmi: 'BMI',
        bmr: 'BMR',
        'body-fat': 'Body Fat',
        'muscle-mass': 'Muscle Mass',
        'water-percentage': 'Body Water'
      },
      wellness: {
        sleep: 'Sleep',
        mood: 'Mood Score',
        stress: 'Stress Level',
        hydration: 'Water'
      },
      fitness: {
        steps: 'Steps',
        active: 'Active Minutes',
        'calories-burned': 'Calories Burned',
        'heart-rate': 'Avg Heart Rate',
        'blood-pressure': 'Blood Pressure'
      }
    };

    const metricEntries = Object.entries(metrics);
    const cardCount = metricEntries.length;

    // Calculate optimal card width based on count
    const getCardWidth = (count, index) => {
      if (count === 6) {
        // 3x2 layout for body tab with 6 items
        return '31%';
      } else if (count === 5) {
        // 3+2 layout: first 3 cards are ~31%, last 2 cards are ~48%
        return index < 3 ? '31%' : '48%';
      } else if (count === 4) {
        // 2+2 layout
        return '48%';
      } else if (count === 3) {
        // 3 across
        return '31%';
      } else {
        // Default 2 across
        return '48%';
      }
    };

    return metricEntries.map(([key, data], index) => (
      <MetricCard
        key={key}
        metricId={key}
        title={metricLabels[activeTab][key]}
        value={data.value}
        unit={data.unit}
        icon={data.icon} // Add icon prop
        isSelected={selectedMetric === key}
        onPress={handleMetricPress}
        onAdd={key === 'weight' ? handleWeightEntry : () => {}}
        cardWidth={getCardWidth(cardCount, index)}
      />
    ));
  };

  const renderWebStyleMetricsForTab = () => {
    const metrics = metricsData[activeTab];
    const metricLabels = {
      nutrition: {
        calories: 'Calories',
        protein: 'Protein',
        carbs: 'Carbs',
        fat: 'Fat',
        fiber: 'Fiber',
        bmr: 'BMR',
        upf: 'Ultra-Processed Foods'
      },
      body: {
        weight: 'Weight',
        bmi: 'BMI',
        'body-fat': 'Body Fat',
        'muscle-mass': 'Muscle Mass',
        'water-percentage': 'Body Water'
      },
      wellness: {
        sleep: 'Sleep',
        mood: 'Mood Score',
        stress: 'Stress Level',
        hydration: 'Water'
      },
      fitness: {
        steps: 'Steps',
        active: 'Active Minutes',
        'calories-burned': 'Calories Burned',
        'heart-rate': 'Avg Heart Rate',
        'blood-pressure': 'Blood Pressure'
      }
    };

    // Filter out hidden metrics
    const metricEntries = Object.entries(metrics).filter(([key, data]) => !data.hidden);

    const cards = [];

    // Add nutrition pie chart if on nutrition tab
    if (activeTab === 'nutrition') {
      const caloriesData = metrics.calories?.value || 0;
      const proteinData = metrics.protein?.value || 0;
      const carbsData = metrics.carbs?.value || 0;
      const fatData = metrics.fat?.value || 0;

      const nutritionPieData = [
        { name: 'Protein', population: proteinData * 4, color: '#4ECDC4', legendFontColor: COLORS.text.secondary },
        { name: 'Carbs', population: carbsData * 4, color: '#95E1D3', legendFontColor: COLORS.text.secondary },
        { name: 'Fat', population: fatData * 9, color: '#F38181', legendFontColor: COLORS.text.secondary }
      ];

      cards.push(
        <TouchableOpacity
          key="nutrition-pie"
          onPress={() => handleMetricPress('calories')}
          style={{
            backgroundColor: isDarkMode ? COLORS.background.tertiary : '#FFFFFF',
            borderRadius: 16,
            padding: 12,
            marginBottom: 16,
            width: '48%',
            borderWidth: selectedMetric === 'calories' ? 2 : 1,
            borderColor: selectedMetric === 'calories'
              ? COLORS.accent.primary
              : (isDarkMode ? 'rgba(176, 176, 176, 0.2)' : 'rgba(224, 224, 224, 0.8)'),
            shadowColor: selectedMetric === 'calories' ? COLORS.accent.primary : '#000',
            shadowOffset: { width: 0, height: selectedMetric === 'calories' ? 6 : 3 },
            shadowOpacity: selectedMetric === 'calories' ? 0.15 : 0.08,
            shadowRadius: selectedMetric === 'calories' ? 12 : 6,
            elevation: selectedMetric === 'calories' ? 4 : 2,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 8, fontWeight: '600' }}>Macros</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 4 }}>
              {caloriesData}
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.text.secondary, marginBottom: 8 }}>kcal</Text>
            {(proteinData > 0 || carbsData > 0 || fatData > 0) && (
              <PieChart
                data={nutritionPieData}
                width={120}
                height={80}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute={false}
                hasLegend={false}
              />
            )}
            <Text style={{ fontSize: 10, color: COLORS.text.secondary, marginTop: 4, textAlign: 'center' }}>
              P: {proteinData}g | C: {carbsData}g | F: {fatData}g
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Add body composition pie chart if on body tab
    if (activeTab === 'body') {
      const fatData = metrics['body-fat']?.value || 0;
      const muscleData = metrics['muscle-mass']?.value || 0;
      const waterData = metrics['water-percentage']?.value || 0;

      const bodyPieData = [
        { name: 'Fat', population: fatData, color: '#FF6B35', legendFontColor: COLORS.text.secondary },
        { name: 'Muscle', population: muscleData, color: '#4ECDC4', legendFontColor: COLORS.text.secondary },
        { name: 'Water', population: waterData, color: '#5DADE2', legendFontColor: COLORS.text.secondary }
      ];

      cards.push(
        <TouchableOpacity
          key="body-composition-pie"
          onPress={() => handleMetricPress('body-fat')}
          style={{
            backgroundColor: isDarkMode ? COLORS.background.tertiary : '#FFFFFF',
            borderRadius: 16,
            padding: 12,
            marginBottom: 16,
            width: '48%',
            borderWidth: selectedMetric === 'body-fat' ? 2 : 1,
            borderColor: selectedMetric === 'body-fat'
              ? COLORS.accent.primary
              : (isDarkMode ? 'rgba(176, 176, 176, 0.2)' : 'rgba(224, 224, 224, 0.8)'),
            shadowColor: selectedMetric === 'body-fat' ? COLORS.accent.primary : '#000',
            shadowOffset: { width: 0, height: selectedMetric === 'body-fat' ? 6 : 3 },
            shadowOpacity: selectedMetric === 'body-fat' ? 0.15 : 0.08,
            shadowRadius: selectedMetric === 'body-fat' ? 12 : 6,
            elevation: selectedMetric === 'body-fat' ? 4 : 2,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 8, fontWeight: '600' }}>Body Composition</Text>
            {(fatData > 0 || muscleData > 0 || waterData > 0) && (
              <PieChart
                data={bodyPieData}
                width={140}
                height={100}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute={false}
                hasLegend={false}
              />
            )}
            <Text style={{ fontSize: 9, color: COLORS.text.secondary, marginTop: 4, textAlign: 'center' }}>
              Fat: {fatData.toFixed(1)}% | Muscle: {muscleData.toFixed(1)}% | Water: {waterData.toFixed(1)}%
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    const cardCount = metricEntries.length + cards.length;

    // Calculate optimal card width based on count
    const getCardWidth = (count, index) => {
      if (count === 4) {
        // 2+2 layout
        return '48%';
      } else if (count === 3) {
        // 3 across
        return '31%';
      } else {
        // Default 2 across
        return '48%';
      }
    };

    // Add regular metric cards
    metricEntries.forEach(([key, data], index) => {
      cards.push(
        <MetricCard
          key={key}
          title={metricLabels[activeTab][key]}
          value={data.value}
          unit={data.unit}
          icon={data.icon}
          isSelected={selectedMetric === key}
          onPress={() => handleMetricPress(key)}
          onAdd={key === 'weight' ? handleWeightEntry : () => {}}
          cardWidth={getCardWidth(cardCount, index + cards.length)}
        />
      );
    });

    return cards;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="{COLORS.background.secondary}"
        translucent={false}
      />

      {/* Success Animation Overlay - Fitbit Style */}
      {showSyncSuccess && (
        <Animated.View
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 100 : 80,
            left: 0,
            right: 0,
            zIndex: 10000,
            opacity: syncSuccessAnim,
            transform: [{
              translateY: syncSuccessAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            }],
          }}
        >
          <View style={{
            marginHorizontal: 16,
            backgroundColor: '#2ECC71',
            borderRadius: 16,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              },
              android: {
                elevation: 8,
              },
            }),
          }}>
            <Animated.View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'white',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              transform: [{
                scale: syncSuccessAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1.1, 1],
                }),
              }],
            }}>
              <Text style={{ fontSize: 20, color: '#2ECC71' }}>✓</Text>
            </Animated.View>
            <Text style={{
              fontSize: 17,
              fontWeight: '700',
              color: 'white',
            }}>
              Data synced successfully
            </Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2ECC71']} // Android - green like Fitbit
            tintColor={COLORS.accent.primary} // iOS
            progressViewOffset={40}
          />
        }
      >
        {/* Fitbit-style Pull to Sync Header */}
        {!refreshing && (
          <View style={{
            alignItems: 'center',
            paddingVertical: 12,
            marginBottom: 8,
          }}>
            <Text style={{
              fontSize: 15,
              color: COLORS.text.secondary,
              fontWeight: '500',
            }}>
              ↓ Pull to sync
            </Text>
          </View>
        )}

        {refreshing && (
          <View style={{
            alignItems: 'center',
            paddingVertical: 12,
            marginBottom: 8,
          }}>
            <Text style={{
              fontSize: 15,
              color: COLORS.accent.primary,
              fontWeight: '600',
            }}>
              Syncing data...
            </Text>
          </View>
        )}

        {/* Today's Summary - Compact */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '600',
            color: COLORS.text.primary,
            marginBottom: 4,
          }}>
            {getTodayDate()}
          </Text>

          {/* Web-Style Sync Banner */}
          <SyncBanner syncStatus={syncStatus} refreshing={refreshing} />
        </View>

        {/* Web-Style Chatbot */}
        <ChatbotSection
          text={chatbotState.text}
          showMoodScale={chatbotState.showMoodScale}
          onMoodSelect={handleMoodSelection}
        />

        {/* Category Tabs - Web Style */}
        <TabContainer
          activeTab={activeTab}
          onTabPress={setActiveTab}
                  />

        {/* Web-Style Metrics Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
          {renderWebStyleMetricsForTab()}
        </View>

        {/* Quick Add Food Section - Only for Nutrition */}
        {activeTab === 'nutrition' && (
          <QuickAddSection
            navigation={navigation}
            onFoodLogged={() => loadMetricsForTab('nutrition')}
          />
        )}

        {/* Web-Style Trends Section */}
        <TrendsSection
          selectedMetric={selectedMetric}
          chartPeriod={chartPeriod}
          onPeriodPress={handlePeriodPress}
          chartData={chartData}
          chartLoading={chartLoading}
                    chartContent={selectedMetric && chartData ? (
            chartData.chartType === 'stacked' ? (
              <View>
                {/* Custom legend at the top for sleep chart */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 8,
                  gap: 12,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, backgroundColor: COLORS.accent.tertiary, borderRadius: 2 }} />
                    <Text style={{ fontSize: 11, color: COLORS.text.secondary }}>Deep</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, backgroundColor: COLORS.accent.primary, borderRadius: 2 }} />
                    <Text style={{ fontSize: 11, color: COLORS.text.secondary }}>Light</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, backgroundColor: COLORS.accent.light, borderRadius: 2 }} />
                    <Text style={{ fontSize: 11, color: COLORS.text.secondary }}>REM</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, backgroundColor: COLORS.accent.secondary, borderRadius: 2 }} />
                    <Text style={{ fontSize: 11, color: COLORS.text.secondary }}>Awake</Text>
                  </View>
                </View>
                <StackedBarChart
                  data={chartData}
                  width={Dimensions.get('window').width - 64}
                  height={240}
                  chartConfig={{
                    backgroundColor: COLORS.background.secondary,
                    backgroundGradientFrom: COLORS.background.secondary,
                    backgroundGradientTo: COLORS.background.secondary,
                    decimalPlaces: 1,
                    color: (opacity = 1) => isDarkMode ? `rgba(176, 176, 176, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                    labelColor: (opacity = 1) => isDarkMode ? `rgba(176, 176, 176, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                    style: {
                      borderRadius: 12,
                    },
                    barPercentage: 0.5,
                    paddingTop: 15,
                    paddingRight: 15,
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 12,
                    backgroundColor: COLORS.background.secondary,
                  }}
                  showLegend={false}
                  withHorizontalLabels={true}
                  withVerticalLabels={true}
                  yAxisSuffix="h"
                />
              </View>
            ) : chartData.chartType === 'body-composition-bar' || chartData.chartType === 'body-composition-line' ? (
              <View>
                {/* Custom legend for body composition */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 8,
                  gap: 12,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, backgroundColor: '#FF6B35', borderRadius: 2 }} />
                    <Text style={{ fontSize: 11, color: COLORS.text.secondary }}>Body Fat</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, backgroundColor: '#4ECDC4', borderRadius: 2 }} />
                    <Text style={{ fontSize: 11, color: COLORS.text.secondary }}>Muscle Mass</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, backgroundColor: '#5DADE2', borderRadius: 2 }} />
                    <Text style={{ fontSize: 11, color: COLORS.text.secondary }}>Water</Text>
                  </View>
                </View>
                {chartData.chartType === 'body-composition-line' ? (
                  <LineChart
                    data={chartData}
                    width={Dimensions.get('window').width - 64}
                    height={200}
                    chartConfig={{
                      backgroundColor: COLORS.background.secondary,
                      backgroundGradientFrom: COLORS.background.secondary,
                      backgroundGradientTo: COLORS.background.secondary,
                      decimalPlaces: 1,
                      color: (opacity = 1) => isDarkMode ? `rgba(176, 176, 176, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                      labelColor: (opacity = 1) => isDarkMode ? `rgba(176, 176, 176, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                      style: {
                        borderRadius: 12,
                      },
                      paddingTop: 15,
                      paddingRight: 15,
                      propsForDots: {
                        r: '4',
                        strokeWidth: '2'
                      }
                    }}
                    fromZero={true}
                    segments={4}
                    yAxisLabel=""
                    yAxisSuffix="%"
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 12,
                      backgroundColor: COLORS.background.secondary,
                    }}
                    withVerticalLines={false}
                  />
                ) : (
                  <BarChart
                    data={chartData}
                    width={Dimensions.get('window').width - 64}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix="%"
                    chartConfig={{
                      backgroundColor: COLORS.background.secondary,
                      backgroundGradientFrom: COLORS.background.secondary,
                      backgroundGradientTo: COLORS.background.secondary,
                      decimalPlaces: 1,
                      color: (opacity = 1) => isDarkMode ? `rgba(176, 176, 176, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                      labelColor: (opacity = 1) => isDarkMode ? `rgba(176, 176, 176, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                      style: {
                        borderRadius: 12,
                      },
                      barPercentage: 0.7,
                      paddingTop: 15,
                      paddingRight: 15,
                    }}
                    style={{
                      marginVertical: 8,
                      borderRadius: 12,
                      backgroundColor: COLORS.background.secondary,
                    }}
                    withVerticalLines={false}
                    fromZero={true}
                  />
                )}
              </View>
            ) : chartData.chartType === 'bar' ? (
              <BarChart
                data={chartData}
                width={Dimensions.get('window').width - 64}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: COLORS.background.secondary,
                  backgroundGradientFrom: COLORS.background.secondary,
                  backgroundGradientTo: COLORS.background.secondary,
                  decimalPlaces: getDecimalPlaces(selectedMetric),
                  color: (opacity = 1) => isDarkMode ? `rgba(13, 211, 211, ${opacity})` : `rgba(13, 211, 211, ${opacity})`,
                  labelColor: (opacity = 1) => isDarkMode ? `rgba(176, 176, 176, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                  style: {
                    borderRadius: 12,
                  },
                  barPercentage: 0.5,
                  paddingTop: 15,
                  paddingRight: 15,
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 12,
                  backgroundColor: COLORS.background.secondary,
                }}
                showValuesOnTopOfBars={true}
              />
            ) : (
              <View>
                {/* Show legend for charts with targets or BMI */}
                {(chartData.hasTarget || selectedMetric === 'bmi') && (
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 8,
                    gap: 12,
                    flexWrap: 'wrap',
                  }}>
                    {chartData.hasTarget && (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <View style={{ width: 16, height: 2, backgroundColor: COLORS.accent.primary }} />
                          <Text style={{ fontSize: 10, color: COLORS.text.secondary }}>Actual</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <View style={{ width: 16, height: 2, backgroundColor: 'rgba(34, 197, 94, 0.7)', borderStyle: 'dashed' }} />
                          <Text style={{ fontSize: 10, color: COLORS.text.secondary }}>Target</Text>
                        </View>
                      </>
                    )}
                  </View>
                )}
                {/* Show legend for BMI chart at the top */}
                {selectedMetric === 'bmi' && (
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 8,
                    gap: 10,
                    flexWrap: 'wrap',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 12, height: 12, backgroundColor: 'rgba(96, 165, 250, 0.15)', borderRadius: 2, borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.7)' }} />
                      <Text style={{ fontSize: 10, color: COLORS.text.secondary }}>Under</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 12, height: 12, backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: 2, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.7)' }} />
                      <Text style={{ fontSize: 10, color: COLORS.text.secondary }}>Normal</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 12, height: 12, backgroundColor: 'rgba(245, 158, 11, 0.15)', borderRadius: 2, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.7)' }} />
                      <Text style={{ fontSize: 10, color: COLORS.text.secondary }}>Over</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 12, height: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 2, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.7)' }} />
                      <Text style={{ fontSize: 10, color: COLORS.text.secondary }}>Obese</Text>
                    </View>
                  </View>
                )}
                {/* Render custom BMI chart or regular chart */}
                <>
                  {selectedMetric === 'bmi' ? (
                    <BMIChart
                      data={chartData.datasets[0].data}
                      labels={chartData.labels}
                      width={Dimensions.get('window').width - 64}
                      height={200}
                    />
                  ) : (
                    <LineChart
                      data={chartData}
                      width={Dimensions.get('window').width - 64}
                      height={200}
                      chartConfig={{
                        backgroundColor: COLORS.background.secondary,
                        backgroundGradientFrom: COLORS.background.secondary,
                        backgroundGradientTo: COLORS.background.secondary,
                        decimalPlaces: getDecimalPlaces(selectedMetric),
                        color: (opacity = 1) => isDarkMode ? `rgba(13, 211, 211, ${opacity})` : `rgba(13, 211, 211, ${opacity})`,
                        labelColor: (opacity = 1) => isDarkMode ? `rgba(176, 176, 176, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                        style: {
                          borderRadius: 12,
                        },
                        paddingTop: 15,
                        paddingRight: 15,
                        propsForDots: {
                          r: '4',
                          strokeWidth: '2',
                          stroke: isDarkMode ? '#6BB6FF' : '#4A90E2'
                        }
                      }}
                      fromZero={false}
                      segments={4}
                      yAxisLabel=""
                      yAxisSuffix=""
                      bezier
                      style={{
                        marginVertical: 8,
                        borderRadius: 12,
                        backgroundColor: COLORS.background.secondary,
                      }}
                    />
                  )}
                  {/* Render target line as an overlay if we have a target value */}
                  {selectedMetric !== 'bmi' && chartData.targetValue && chartData.datasets.length > 0 && (() => {
                    const dataMin = Math.min(...chartData.datasets[0].data.filter(v => v > 0));
                    const dataMax = Math.max(...chartData.datasets[0].data);
                    const targetValue = chartData.targetValue;

                    // Calculate position as percentage
                    const range = dataMax - dataMin;
                    const targetPercent = ((dataMax - targetValue) / range) * 100;

                    // Show target if it's within a wider range (to accommodate weight loss goals)
                    if (targetValue >= dataMin * 0.7 && targetValue <= dataMax * 1.5) {
                      return (
                        <View style={{
                          position: 'absolute',
                          top: `${15 + (targetPercent * 0.7)}%`, // Approximate positioning
                          left: 50,
                          right: 20,
                          height: 2,
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderTopWidth: 2,
                          borderTopColor: 'rgba(34, 197, 94, 0.8)',
                          borderStyle: 'dashed',
                        }}>
                          <Text style={{
                            position: 'absolute',
                            right: 0,
                            top: -10,
                            fontSize: 9,
                            color: 'rgba(34, 197, 94, 0.8)',
                            fontWeight: '600',
                          }}>
                            Target
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                </>
              </View>
            )
          ) : null}
        />

        <View style={{ height: 120 }} />
      </ScrollView>


      {/* Logout button in top right */}
      <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.goBack()}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Weight Entry Modal */}
      <Modal
        visible={showWeightModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: COLORS.background.secondary,
            borderRadius: 16,
            padding: 24,
            width: '80%',
            maxWidth: 400,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: COLORS.text.primary,
              marginBottom: 16,
            }}>
              Log Weight
            </Text>

            <TextInput
              style={{
                backgroundColor: COLORS.background.tertiary,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: COLORS.text.primary,
                marginBottom: 24,
              }}
              placeholder="Enter weight (kg)"
              placeholderTextColor={isDarkMode ? '#B0B0B0' : '#666666'}
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus={true}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                }}
                onPress={() => setShowWeightModal(false)}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: COLORS.text.secondary,
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: COLORS.accent.primary,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                }}
                onPress={saveWeight}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Celebration Modal */}
      <Modal
        visible={showCelebrationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCelebrationModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#0dd3d3', // Turquoise gradient start
            borderRadius: 20,
            padding: 40,
            width: '85%',
            maxWidth: 400,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.4,
            shadowRadius: 60,
            elevation: 10,
          }}>
            {celebrationData && (
              <>
                {/* Emoji */}
                <Text style={{
                  fontSize: 80,
                  marginBottom: 20,
                }}>
                  {celebrationData.goalType === 'weight' ? '🎯' : celebrationData.goalType === 'steps' ? '👟' : '🎉'}
                </Text>

                {/* Title */}
                <Text style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  marginBottom: 15,
                  textAlign: 'center',
                }}>
                  {celebrationData.goalType === 'weight' ? 'Weight Goal Achieved!' :
                   celebrationData.goalType === 'steps' ? 'Step Goal Achieved!' :
                   'Goal Achieved!'}
                </Text>

                {/* Message */}
                <Text style={{
                  fontSize: 18,
                  color: 'rgba(255, 255, 255, 0.95)',
                  marginBottom: 30,
                  textAlign: 'center',
                  lineHeight: 26,
                }}>
                  {celebrationData.goalType === 'weight'
                    ? `Congratulations! You've reached your target weight of ${
                        typeof celebrationData.targetValue === 'string'
                          ? parseFloat(celebrationData.targetValue)
                          : celebrationData.targetValue
                      } ${celebrationData.targetUnit || 'kg'}!`
                    : celebrationData.goalType === 'steps'
                    ? `Amazing! You've hit your daily step goal of ${
                        (typeof celebrationData.targetValue === 'string'
                          ? parseFloat(celebrationData.targetValue)
                          : celebrationData.targetValue
                        ).toLocaleString()
                      } steps!`
                    : 'Congratulations on reaching your goal!'}
                </Text>

                {/* Action Buttons */}
                <View style={{ width: '100%', gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      padding: 14,
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setShowCelebrationModal(false);
                      navigation.navigate('Targets');
                    }}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#0dd3d3',
                    }}>
                      Adjust My Goal
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderWidth: 2,
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      borderRadius: 8,
                      padding: 14,
                      alignItems: 'center',
                    }}
                    onPress={() => setShowCelebrationModal(false)}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#FFFFFF',
                    }}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Confetti for celebrations */}
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: Dimensions.get('window').width / 2, y: -10 }}
        autoStart={false}
        fadeOut={true}
        fallSpeed={3000}
        colors={['#0dd3d3', '#5ef3f3', '#0fa3a3', '#FFD700', '#FFA500', '#FF6B35']}
      />
    </SafeAreaView>
  );
}

// Design System - Matching Web App CSS Variables
const designTokens = {
  // Colors - Navy/Teal theme
  primaryTeal: COLORS.accent.primary,       // Main teal/cyan #0dd3d3
  primaryTealLight: COLORS.accent.light,    // Light teal #5ef3f3
  primaryTealDark: COLORS.accent.tertiary,  // Darker teal #0fa3a3

  // Neutrals
  pureWhite: '#FFFFFF',
  offWhite: '#FAFAFA',
  lightGray: '#F5F5F5',
  mediumGray: '#E0E0E0',
  textGray: COLORS.text.tertiary,           // Medium gray #8892a6
  darkGray: COLORS.text.secondary,          // Light blue-gray #b8c5d6

  // Dark theme (navy backgrounds)
  darkPureWhite: COLORS.background.black,    // Darker navy #0f1729
  darkOffWhite: COLORS.background.primary,   // Deep navy #16213e
  darkLightGray: COLORS.background.secondary, // Card background #252d4a
  darkMediumGray: COLORS.background.tertiary, // Input background #2d3561
  darkTextGray: COLORS.text.secondary,       // Light blue-gray #b8c5d6
  darkDarkGray: COLORS.text.primary,         // White #FFFFFF

  // Spacing
  spaceXs: 4,
  spaceSm: 8,
  spaceMd: 16,
  spaceLg: 24,
  spaceXl: 32,
  space2xl: 48,

  // Typography
  textXs: 12,
  textSm: 14,
  textBase: 16,
  textLg: 18,
  textXl: 24,
  text2xl: 32,

  // Border Radius
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 999,

  // Shadows
  shadowSm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  shadowMd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  shadowLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
};

// Dynamic styles based on dark mode
const createStyles = (isDarkMode) => {
  const colors = {
    background: isDarkMode ? designTokens.darkOffWhite : designTokens.offWhite,
    surface: isDarkMode ? designTokens.darkLightGray : designTokens.pureWhite,
    primary: isDarkMode ? designTokens.primaryTealLight : designTokens.primaryTeal,
    textPrimary: isDarkMode ? designTokens.darkDarkGray : designTokens.darkGray,
    textSecondary: isDarkMode ? designTokens.darkTextGray : designTokens.textGray,
    border: isDarkMode ? designTokens.darkMediumGray : designTokens.mediumGray,
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: designTokens.spaceMd,
      paddingTop: 50, // Status bar clearance
    },

    // Today's Summary - matching web app
    todaySection: {
      marginBottom: designTokens.spaceSm,
    },
    dateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spaceSm,
    },
    dateDisplay: {
      fontSize: designTokens.text2xl,
      fontWeight: '600',
      color: colors.textPrimary,
      fontFamily: '-apple-system', // System font matching web
    },
    dateSubtitle: {
      fontSize: designTokens.textSm,
      color: colors.textSecondary,
      marginTop: designTokens.spaceXs,
    },

    // Sync Banner - Professional design
    syncBanner: {
      backgroundColor: colors.primary,
      marginTop: designTokens.spaceMd,
      marginHorizontal: -designTokens.spaceMd, // Extend to screen edges
      paddingVertical: designTokens.spaceMd,
      paddingHorizontal: designTokens.spaceMd,
      ...designTokens.shadowMd,
    },
    syncBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    syncBannerText: {
      color: designTokens.pureWhite,
      fontSize: designTokens.textSm,
      fontWeight: '600',
      textAlign: 'center',
      flex: 1,
    },
    syncSpinner: {
      marginLeft: designTokens.spaceSm,
    },

    // Chatbot Section - Glass Morphism matching web app
    chatbotSection: {
      backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      borderRadius: designTokens.radiusMd,
      padding: designTokens.spaceMd,
      marginBottom: designTokens.spaceLg,
      borderWidth: 2,
      borderColor: isDarkMode ? 'rgba(176, 176, 176, 0.1)' : 'rgba(13, 211, 211, 0.1)',
      ...designTokens.shadowMd,
    },
    chatContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chatAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...designTokens.shadowSm,
    },
    chatAvatarText: {
      fontSize: 18,
      color: designTokens.pureWhite,
    },
    chatText: {
      fontSize: designTokens.textSm,
      color: colors.textPrimary,
      fontWeight: '500',
      flex: 1,
      lineHeight: 20,
    },

    // Tab Container - Professional segmented control
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: designTokens.radiusMd,
      padding: designTokens.spaceXs,
      marginBottom: designTokens.spaceLg,
      ...designTokens.shadowSm,
    },
    tabButton: {
      flex: 1,
      paddingVertical: designTokens.spaceMd,
      paddingHorizontal: designTokens.spaceSm,
      borderRadius: designTokens.radiusSm,
      alignItems: 'center',
    },
    tabButtonActive: {
      backgroundColor: colors.primary,
      ...designTokens.shadowSm,
    },
    tabText: {
      fontSize: designTokens.textSm,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: designTokens.pureWhite,
      fontWeight: '600',
    },

    // Metrics Grid - Enhanced design matching web
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: designTokens.spaceLg,
    },
    metricCard: {
      backgroundColor: colors.surface,
      borderRadius: designTokens.radiusLg,
      padding: 12, // Compact mobile spacing
      marginBottom: designTokens.spaceMd,
      minHeight: 85, // Slightly taller for better proportions
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      position: 'relative',
      overflow: 'hidden',
      ...designTokens.shadowSm,
    },
    metricCardSelected: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? 'rgba(13, 211, 211, 0.1)' : '#F8FBFF',
      ...designTokens.shadowMd,
    },
    metricCardHover: {
      transform: [{ translateY: -2 }],
      ...designTokens.shadowMd,
    },
    // Top border accent (matching web app ::before)
    metricCardAccent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: colors.primary,
    },
    metricContent: {
      alignItems: 'center',
      width: '100%',
    },
    metricTitle: {
      fontSize: designTokens.textXs,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: designTokens.spaceXs,
      textAlign: 'center',
    },
    metricValue: {
      fontSize: designTokens.textXl,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 28,
    },
    metricTitleSelected: {
      color: colors.primary,
    },
    metricValueSelected: {
      color: colors.primary,
    },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: designTokens.radiusFull,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: designTokens.spaceXs,
      ...designTokens.shadowSm,
    },
    addButtonSelected: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    addButtonText: {
      color: designTokens.pureWhite,
      fontSize: 18,
      fontWeight: 'bold',
    },
    addButtonTextSelected: {
      color: colors.primary,
    },

    // Trends Section - Enhanced design
    trendsSection: {
      marginBottom: designTokens.spaceLg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spaceMd,
    },
    sectionTitle: {
      fontSize: designTokens.textLg,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    timeSelector: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: designTokens.radiusSm,
      padding: 2,
      ...designTokens.shadowSm,
    },
    timeOption: {
      paddingVertical: 6,
      paddingHorizontal: designTokens.spaceMd,
      borderRadius: 6,
    },
    timeOptionActive: {
      backgroundColor: colors.primary,
      ...designTokens.shadowSm,
    },
    timeOptionText: {
      fontSize: designTokens.textXs,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    timeOptionTextActive: {
      color: designTokens.pureWhite,
      fontWeight: '600',
    },
    trendsCard: {
      backgroundColor: colors.surface,
      borderRadius: designTokens.radiusMd,
      padding: designTokens.spaceLg,
      alignItems: 'center',
      justifyContent: 'center',
      height: 200,
      ...designTokens.shadowMd,
    },

    // Chart styles
    chartSelected: {
      alignItems: 'center',
    },
    chartSelectedTitle: {
      fontSize: designTokens.textLg,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: designTokens.spaceMd,
      textAlign: 'center',
    },
    chartLoading: {
      fontSize: designTokens.textSm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: designTokens.spaceMd,
    },
    trendsInstruction: {
      fontSize: designTokens.textSm,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },

    // Mood Scale - Matching web app design
    moodScale: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginTop: designTokens.spaceSm,
      paddingHorizontal: designTokens.spaceMd,
    },
    moodOption: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: designTokens.radiusFull,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      ...designTokens.shadowSm,
    },
    moodOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    moodEmoji: {
      fontSize: 16,
    },


    // Logout Button - Enhanced
    logoutButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      paddingHorizontal: designTokens.spaceMd,
      paddingVertical: designTokens.spaceSm,
      borderRadius: designTokens.radiusFull,
      ...designTokens.shadowSm,
    },
    logoutText: {
      fontSize: designTokens.textSm,
      color: colors.primary,
      fontWeight: '500',
    },

    // Missing metric styles
    metricHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: designTokens.spaceXs,
    },
    metricIcon: {
      fontSize: 20,
      marginRight: designTokens.spaceSm,
    },
  });
};
