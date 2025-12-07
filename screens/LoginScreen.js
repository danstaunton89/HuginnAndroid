import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Linking, Image, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export default function LoginScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [currentCodeVerifier, setCurrentCodeVerifier] = useState(null);

  // OAuth configuration
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  // Production Google Client ID for HealthTrackerProd
  const clientId = '7206770810-si1kak4s3dhldh8egk6a8dm7op0kfk42.apps.googleusercontent.com';

  // For production, use our backend's mobile OAuth endpoint
  const redirectUri = `${API_BASE_URL}/auth/mobile/callback`;

  // Handle deep link from custom domain callback
  useEffect(() => {
    const handleDeepLink = async (url) => {
      console.log('Deep link received:', url);

      if (url && url.includes('auth/callback')) {
        try {
          setIsLoading(true);

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
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', error.message || 'Failed to start authentication');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.authContainer}>
          <Image
            source={require('../assets/images/crow.png')}
            style={styles.crowImage}
            resizeMode="contain"
          />

          <Text style={styles.title}>Huginn</Text>
          <Text style={styles.subtitle}>Your personal health companion</Text>

          <Text style={styles.deviceText}>
            Works with <Text style={styles.deviceBold}>Fitbit</Text>, <Text style={styles.deviceBold}>Garmin</Text> and <Text style={styles.deviceBold}>Withings</Text>
          </Text>

          <View style={styles.betaWarning}>
            <Text style={styles.betaTitle}>Invite-Only Beta</Text>
            <Text style={styles.betaSubtext}>Registration requires a valid invitation code</Text>
            <TouchableOpacity onPress={() => setShowRequestForm(true)}>
              <Text style={styles.requestLink}>Request an invite →</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <Text style={styles.googleButtonText}>
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.featuresText}>
            Track meals • Monitor health • Sync devices
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By signing in, you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={styles.contactFooter}>
            <Text style={styles.contactText}>Questions or feedback?</Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:hello@huginn.health')}>
              <Text style={styles.contactEmail}>hello@huginn.health</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authContainer: {
    backgroundColor: '#1E293B',
    padding: 48,
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  crowImage: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  deviceText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 0,
  },
  deviceBold: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  betaWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  betaTitle: {
    fontSize: 13,
    color: '#FBBF24',
    fontWeight: '700',
    textAlign: 'center',
  },
  betaSubtext: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
    textAlign: 'center',
  },
  requestLink: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: '#14B8A6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(20, 184, 166, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  featuresText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 17,
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },
  footerLink: {
    color: '#14B8A6',
  },
  contactFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  contactText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
    textAlign: 'center',
  },
});
