import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, useColorScheme, StatusBar, SafeAreaView, StyleSheet } from 'react-native';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { MealProvider } from './contexts/MealContext';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FF6B35'
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  }
});
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import MealsScreen from './screens/MealsScreen';
import TargetsScreen from './screens/TargetsScreen';
import CreateMealScreen from './screens/CreateMealScreen';
import AddIngredientScreen from './screens/AddIngredientScreen';
import BarcodeScannerScreen from './screens/BarcodeScannerScreen';
import ManualIngredientScreen from './screens/ManualIngredientScreen';
import QuantitySelectorScreen from './screens/QuantitySelectorScreen';
import AIMealGeneratorScreen from './screens/AIMealGeneratorScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();


function MainTabs() {
  const { isDarkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E1E1E',
          borderTopColor: '#2C2C2C',
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: '#0dd3d3',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
      key={isDarkMode ? 'dark' : 'light'}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: 20, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Meals"
        component={MealsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: 20, color }}>🍽️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Targets"
        component={TargetsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: 20, color }}>🎯</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: 20, color }}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  return (
    <ThemeProvider>
      <MealProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="CreateMeal"
              component={CreateMealScreen}
              options={{
                presentation: 'modal',
                headerShown: false
              }}
            />
            <Stack.Screen
              name="AddIngredient"
              component={AddIngredientScreen}
              options={{
                presentation: 'modal',
                headerShown: false
              }}
            />
            <Stack.Screen
              name="BarcodeScanner"
              component={BarcodeScannerScreen}
              options={{
                presentation: 'modal',
                headerShown: false
              }}
            />
            <Stack.Screen
              name="ManualIngredient"
              component={ManualIngredientScreen}
              options={{
                presentation: 'modal',
                headerShown: false
              }}
            />
            <Stack.Screen
              name="QuantitySelector"
              component={QuantitySelectorScreen}
              options={{
                presentation: 'modal',
                headerShown: false
              }}
            />
            <Stack.Screen
              name="AIMealGenerator"
              component={AIMealGeneratorScreen}
              options={{
                presentation: 'modal',
                headerShown: false
              }}
            />
          </Stack.Navigator>
          <StatusBar
            barStyle="light-content"
            backgroundColor="#121212"
            translucent
          />
        </NavigationContainer>
      </MealProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
