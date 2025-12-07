import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Alert, StatusBar, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function SettingsScreen({ navigation }) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Profile state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [googleId, setGoogleId] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('');

  // Device integration state
  const [fitbitConnected, setFitbitConnected] = useState(false);
  const [fitbitStatus, setFitbitStatus] = useState('loading');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      const [userResponse, fitbitStatusResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/user`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/api/fitbit/status`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }).catch(() => null)
      ]);

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setFirstName(userData.first_name || '');
        setLastName(userData.last_name || '');
        setEmail(userData.email || '');
        setCountry(userData.country || '');
        setGoogleId(userData.google_id || '');
        setHeightCm(userData.height ? userData.height.toString() : '');
        setSex(userData.sex || '');

        // Format date of birth to YYYY-MM-DD
        if (userData.date_of_birth) {
          const dob = new Date(userData.date_of_birth);
          const year = dob.getFullYear();
          const month = String(dob.getMonth() + 1).padStart(2, '0');
          const day = String(dob.getDate()).padStart(2, '0');
          setDateOfBirth(`${year}-${month}-${day}`);
        }

        if (userData.created_at) {
          const date = new Date(userData.created_at);
          setMemberSince(date.toLocaleDateString());
        }
      }

      if (fitbitStatusResponse && fitbitStatusResponse.ok) {
        const fitbitData = await fitbitStatusResponse.json();
        setFitbitConnected(fitbitData.connected);
        setFitbitStatus('loaded');
      } else {
        setFitbitStatus('loaded');
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

  const saveProfile = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const profileResponse = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: firstName,
          lastName: lastName,
          country: country,
          dateOfBirth: dateOfBirth,
          sex: sex
        })
      });

      if (heightCm) {
        await fetch(`${API_BASE_URL}/api/user/height`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            height: parseFloat(heightCm),
            height_unit: 'cm'
          })
        });
      }

      if (profileResponse.ok) {
        await loadData(); // Reload data to reflect changes
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const connectFitbit = async () => {
    Alert.alert('Fitbit', 'Fitbit connection requires web authentication. Please use the web app to connect your Fitbit device.');
  };

  const disconnectFitbit = async () => {
    Alert.alert(
      'Disconnect Fitbit',
      'Are you sure you want to disconnect your Fitbit device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const authToken = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_BASE_URL}/api/fitbit/disconnect`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
              });

              if (response.ok) {
                setFitbitConnected(false);
                Alert.alert('Success', 'Fitbit disconnected');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect Fitbit');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            navigation.navigate('Login');
          }
        }
      ]
    );
  };

  const SettingSection = ({ title, children }) => (
    <View style={styles.settingSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.black} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 400 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent.primary} />}
      >
        {/* Profile Information */}
        <SettingSection title="PROFILE INFORMATION">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 Profile Details</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor={COLORS.text.tertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor={COLORS.text.tertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={email}
                editable={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.text.tertiary}
              />
              <Text style={styles.helpText}>Used for BMR and age-based calculations</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Sex</Text>
              <View style={styles.sexButtonGroup}>
                <TouchableOpacity
                  style={[styles.sexButton, sex === 'M' && styles.sexButtonActive]}
                  onPress={() => setSex('M')}
                >
                  <Text style={[styles.sexButtonText, sex === 'M' && styles.sexButtonTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sexButton, sex === 'F' && styles.sexButtonActive]}
                  onPress={() => setSex('F')}
                >
                  <Text style={[styles.sexButtonText, sex === 'F' && styles.sexButtonTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>Used for accurate BMR calculations</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="175"
                placeholderTextColor={COLORS.text.tertiary}
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>Used for BMI calculations</Text>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </SettingSection>

        {/* Account Information */}
        <SettingSection title="ACCOUNT INFORMATION">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔐 Account Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Google ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{googleId || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{memberSince || 'N/A'}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                <Text style={styles.infoBoxBold}>Authentication:</Text> You're signed in with Google. Your account is secure and your data is protected.
              </Text>
            </View>
          </View>
        </SettingSection>

        {/* Device Integrations */}
        <SettingSection title="DEVICE INTEGRATIONS">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔌 Connect Devices</Text>

            {/* Fitbit */}
            <View style={styles.integrationItem}>
              <View style={styles.integrationHeader}>
                <Text style={styles.integrationIcon}>⌚</Text>
                <View style={styles.integrationInfo}>
                  <Text style={styles.integrationName}>Fitbit</Text>
                  <Text style={styles.integrationDescription}>Steps, sleep, exercise</Text>
                </View>
              </View>

              {fitbitStatus === 'loading' ? (
                <ActivityIndicator size="small" color={COLORS.accent.primary} />
              ) : fitbitConnected ? (
                <View style={styles.connectedContainer}>
                  <View style={styles.connectedBadge}>
                    <Text style={styles.connectedText}>✅ Connected</Text>
                  </View>
                  <TouchableOpacity style={styles.disconnectButton} onPress={disconnectFitbit}>
                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.connectButton} onPress={connectFitbit}>
                  <Text style={styles.connectButtonText}>Connect</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Withings */}
            <View style={styles.integrationItem}>
              <View style={styles.integrationHeader}>
                <Text style={styles.integrationIcon}>⚖️</Text>
                <View style={styles.integrationInfo}>
                  <Text style={styles.integrationName}>Withings</Text>
                  <Text style={styles.integrationDescription}>Weight, body composition</Text>
                </View>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            </View>
          </View>
        </SettingSection>

        {/* App Preferences */}
        <SettingSection title="APP PREFERENCES">
          <View style={styles.card}>
            <TouchableOpacity style={styles.preferenceItem} onPress={toggleDarkMode} activeOpacity={0.7}>
              <View style={styles.preferenceLeft}>
                <Text style={styles.preferenceIcon}>🌙</Text>
                <View>
                  <Text style={styles.preferenceTitle}>Dark Mode</Text>
                  <Text style={styles.preferenceSubtitle}>{isDarkMode ? 'Enabled' : 'Disabled'}</Text>
                </View>
              </View>
              <View style={[styles.toggle, isDarkMode && styles.toggleActive]}>
                <View style={[styles.toggleIndicator, isDarkMode && styles.toggleIndicatorActive]} />
              </View>
            </TouchableOpacity>
          </View>
        </SettingSection>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  settingSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabledInput: {
    backgroundColor: '#1A1A1A',
    color: COLORS.text.tertiary,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  sexButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  sexButton: {
    flex: 1,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  sexButtonActive: {
    backgroundColor: COLORS.accent.primary,
    borderColor: COLORS.accent.primary,
  },
  sexButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  sexButtonTextActive: {
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.tertiary,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  infoBox: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  infoBoxBold: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  integrationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.tertiary,
  },
  integrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  integrationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  integrationDescription: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectedBadge: {
    backgroundColor: '#2A4A2A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectedText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.accent.secondary,
  },
  connectButton: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disconnectButton: {
    backgroundColor: '#8B0000',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  comingSoonBadge: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  preferenceSubtitle: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.accent.primary,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  toggleIndicatorActive: {
    transform: [{ translateX: 22 }],
  },
  logoutSection: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
  logoutButton: {
    backgroundColor: '#8B0000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});