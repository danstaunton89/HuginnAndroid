import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Linking, Image } from 'react-native';
// Removed expo-auth-session and expo-crypto - using manual OAuth implementation
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function LoginScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentCodeVerifier, setCurrentCodeVerifier] = useState(null);

  // Using custom domain for OAuth callback

  // OAuth configuration
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  // Production Google Client ID for HealthTrackerProd
  const clientId = '7206770810-si1kak4s3dhldh8egk6a8dm7op0kfk42.apps.googleusercontent.com';

  // For production, use our backend's mobile OAuth endpoint
  // The backend has /auth/mobile/callback for handling mobile OAuth
  const redirectUri = `${API_BASE_URL}/auth/mobile/callback`;

  // Handle deep link from custom domain callback
  useEffect(() => {
    const handleDeepLink = async (url) => {
      console.log('Deep link received:', url);

      // Handle our custom scheme: com.blacksquirrel.healthtracker://auth/callback?token=...
      if (url && url.includes('auth/callback')) {
        try {
          setIsLoading(true);

          // Parse query parameters from custom scheme URL
          // URL format: com.blacksquirrel.healthtracker://auth/callback?token=xxx&registrationComplete=true
          const queryString = url.split('?')[1];
          if (!queryString) {
            console.error('No query string in URL:', url);
            setIsLoading(false);
            Alert.alert('Error', 'Invalid authentication callback');
            return;
          }

          // Parse query parameters manually
          const params = {};
          queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            params[key] = decodeURIComponent(value);
          });

          console.log('Parsed params:', params);

          const token = params.token;
          const registrationComplete = params.registrationComplete === 'true';
          const email = params.email;

          console.log('Auth token received, registrationComplete:', registrationComplete);

          if (token) {
            await AsyncStorage.setItem('authToken', token);

            if (!registrationComplete) {
              setIsLoading(false);
              navigation.navigate('Register', { email });
            } else {
              setIsLoading(false);
              navigation.navigate('Main');
            }
          } else {
            console.error('No token in callback');
            setIsLoading(false);
            Alert.alert('Error', 'No authentication token received');
          }
        } catch (error) {
          console.error('Error parsing deep link:', error);
          setIsLoading(false);
          Alert.alert('Error', 'Failed to process authentication callback: ' + error.message);
        }
      }
    };

    // Listen for initial URL (when app is opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
        handleDeepLink(url);
      }
    });

    // Listen for subsequent URLs (when app is already running)
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('URL event:', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleAuthCode = async (code) => {
    console.log('handleAuthCode called with code:', code?.substring(0, 20) + '...');
    setIsLoading(true);

    try {
      // For mobile OAuth, we don't use PKCE, so we can exchange the code directly
      console.log('Exchanging code for token...');

      // Exchange authorization code for token via our backend
      const tokenResponse = await fetch(`${API_BASE_URL}/auth/mobile/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code
        }),
      });

      const data = await tokenResponse.json();
      console.log('Token exchange response:', { success: data.success, hasToken: !!data.token });

      if (data.success && data.token) {
        await AsyncStorage.setItem('authToken', data.token);

        // Check if registration is complete
        if (data.registrationComplete === false) {
          setIsLoading(false);
          navigation.navigate('Register', { email: data.email });
        } else {
          setIsLoading(false);
          navigation.navigate('Main');
        }
      } else {
        throw new Error(data.error || 'Failed to authenticate');
      }
    } catch (error) {
      console.error('Auth code handling error:', error);
      setIsLoading(false);
      Alert.alert('Login Error', error.message || 'Failed to complete authentication');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Direct OAuth URL construction
      const redirectUrl = `${API_BASE_URL}/auth/mobile/callback`;

      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid profile email')}`;

      console.log('Opening OAuth URL:', oauthUrl);

      // Open OAuth in browser - the callback will deep link back to the app
      await Linking.openURL(oauthUrl);

      // Loading state will be cleared when the deep link callback is received
      // or user can cancel by reopening the app
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', error.message || 'Failed to start authentication');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.authContainer}>
        <Image
          source={require('../assets/images/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Your personal health companion</Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Track meals and nutrition</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Monitor weight and blood pressure</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Record mood and wellness</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Track water intake</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Log exercise activities</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Sync with fitness devices</Text>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Invite-only beta:</Text> Registration requires a valid invite code.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.black,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authContainer: {
    backgroundColor: COLORS.background.primary,
    padding: 32,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderTopWidth: 3,
    borderTopColor: COLORS.accent.primary,
  },
  logo: {
    width: '80%',
    height: 120,
    marginBottom: 24,
    alignSelf: 'center',
  },
  tagline: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  features: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkmark: {
    color: COLORS.accent.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  featureText: {
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  buttonGroup: {
    marginBottom: 20,
  },
  googleButton: {
    backgroundColor: COLORS.accent.primary,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  googleIcon: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleIconText: {
    color: COLORS.accent.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    backgroundColor: COLORS.background.secondary,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoBold: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
});