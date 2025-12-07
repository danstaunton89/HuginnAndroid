import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function LoginScreenSimple({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      // Simply open the web auth in the browser
      // After login, user manually returns to app
      const webAuthUrl = `${API_BASE_URL}/auth/google`;

      Alert.alert(
        'Sign In',
        'You will be redirected to sign in with Google. After signing in, return to the app.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              await Linking.openURL(webAuthUrl);
              // Show a button to check if logged in
              setIsLoading(true);
              setTimeout(() => {
                Alert.alert(
                  'Signed In?',
                  'Have you completed sign in?',
                  [
                    {
                      text: 'Yes, check my session',
                      onPress: checkAuthStatus
                    },
                    {
                      text: 'No, try again',
                      onPress: () => setIsLoading(false)
                    }
                  ]
                );
              }, 3000);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to open sign in page');
    }
  };

  const checkAuthStatus = async () => {
    try {
      // Check if we're authenticated by calling a protected endpoint
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        navigation.replace('MainApp');
      } else {
        Alert.alert('Not Signed In', 'Please try signing in again');
        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not verify sign in status');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Black Squirrel Health</Text>
      <Text style={styles.subtitle}>Your personal health companion</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4285f4" />
      ) : (
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.black,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 40,
  },
  googleButton: {
    backgroundColor: COLORS.accent.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  googleButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});