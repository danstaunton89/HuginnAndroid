import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function RegisterScreen({ navigation, route }) {
  const { email } = route.params || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    email: email || '',
    inviteCode: '',
    displayName: '',
    country: '',
    height: '',
    heightUnit: 'ft',
    weight: '',
    weightUnit: 'lbs',
    targetWeight: '',
    birthYear: ''
  });

  const questions = [
    {
      id: 'inviteCode',
      question: "👋 Welcome! What's your invite code?",
      placeholder: 'Enter invite code',
      type: 'text',
      required: true
    },
    {
      id: 'displayName',
      question: "What should we call you?",
      placeholder: 'Your name',
      type: 'text',
      required: true
    },
    {
      id: 'birthYear',
      question: "What year were you born?",
      placeholder: 'YYYY',
      type: 'number',
      required: false
    },
    {
      id: 'country',
      question: "Where are you located?",
      placeholder: 'Your country',
      type: 'text',
      required: false
    },
    {
      id: 'height',
      question: "How tall are you?",
      placeholder: 'Height',
      type: 'height',
      required: false
    },
    {
      id: 'weight',
      question: "What's your current weight?",
      placeholder: 'Weight',
      type: 'weight',
      required: false
    },
    {
      id: 'targetWeight',
      question: "What's your target weight?",
      placeholder: 'Target weight',
      type: 'number',
      required: false
    }
  ];

  const totalSteps = questions.length;

  const handleNext = () => {
    const currentQuestion = questions[currentStep];
    const value = formData[currentQuestion.id];

    if (currentQuestion.required && !value) {
      Alert.alert('Required Field', 'Please answer this question to continue.');
      return;
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    const currentQuestion = questions[currentStep];
    if (!currentQuestion.required) {
      handleNext();
    }
  };

  const handleSubmit = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');

      // Validate invite code
      const inviteResponse = await fetch(`${API_BASE_URL}/api/register/validate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          invite_code: formData.inviteCode
        })
      });

      const inviteData = await inviteResponse.json();
      if (!inviteData.valid) {
        Alert.alert('Invalid Code', 'The invite code is invalid or has expired.');
        setCurrentStep(0);
        return;
      }

      // Submit registration
      const registrationData = {
        display_name: formData.displayName,
        invite_code: formData.inviteCode,
        country: formData.country || null,
        birth_year: formData.birthYear ? parseInt(formData.birthYear) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        height_unit: formData.heightUnit,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        weight_unit: formData.weightUnit,
        target_weight: formData.targetWeight ? parseFloat(formData.targetWeight) : null,
        target_weight_unit: formData.weightUnit
      };

      const response = await fetch(`${API_BASE_URL}/api/register/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Welcome!',
          'Registration complete! Let\'s get started.',
          [
            { text: 'OK', onPress: () => navigation.navigate('Main') }
          ]
        );
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Registration Error', error.message || 'Failed to complete registration');
    }
  };

  const renderInput = () => {
    const question = questions[currentStep];

    switch (question.type) {
      case 'height':
        return (
          <View style={styles.measurementInput}>
            <View style={styles.unitSelector}>
              <TouchableOpacity
                style={[styles.unitBtn, formData.heightUnit === 'ft' && styles.unitBtnActive]}
                onPress={() => setFormData({ ...formData, heightUnit: 'ft' })}
              >
                <Text style={[styles.unitBtnText, formData.heightUnit === 'ft' && styles.unitBtnTextActive]}>
                  ft/in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, formData.heightUnit === 'cm' && styles.unitBtnActive]}
                onPress={() => setFormData({ ...formData, heightUnit: 'cm' })}
              >
                <Text style={[styles.unitBtnText, formData.heightUnit === 'cm' && styles.unitBtnTextActive]}>
                  cm
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder={formData.heightUnit === 'ft' ? 'Height in feet' : 'Height in cm'}
              placeholderTextColor="#666666"
              value={formData.height}
              onChangeText={(text) => setFormData({ ...formData, height: text })}
              keyboardType="numeric"
            />
          </View>
        );

      case 'weight':
        return (
          <View style={styles.measurementInput}>
            <View style={styles.unitSelector}>
              <TouchableOpacity
                style={[styles.unitBtn, formData.weightUnit === 'lbs' && styles.unitBtnActive]}
                onPress={() => setFormData({ ...formData, weightUnit: 'lbs' })}
              >
                <Text style={[styles.unitBtnText, formData.weightUnit === 'lbs' && styles.unitBtnTextActive]}>
                  lbs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, formData.weightUnit === 'kg' && styles.unitBtnActive]}
                onPress={() => setFormData({ ...formData, weightUnit: 'kg' })}
              >
                <Text style={[styles.unitBtnText, formData.weightUnit === 'kg' && styles.unitBtnTextActive]}>
                  kg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, formData.weightUnit === 'stone' && styles.unitBtnActive]}
                onPress={() => setFormData({ ...formData, weightUnit: 'stone' })}
              >
                <Text style={[styles.unitBtnText, formData.weightUnit === 'stone' && styles.unitBtnTextActive]}>
                  st
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder={`Weight in ${formData.weightUnit}`}
              placeholderTextColor="#666666"
              value={formData.weight}
              onChangeText={(text) => setFormData({ ...formData, weight: text })}
              keyboardType="numeric"
            />
          </View>
        );

      default:
        return (
          <TextInput
            style={styles.input}
            placeholder={question.placeholder}
            placeholderTextColor="#666666"
            value={formData[question.id]}
            onChangeText={(text) => setFormData({ ...formData, [question.id]: text })}
            keyboardType={question.type === 'number' ? 'numeric' : 'default'}
          />
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <Text style={styles.logo}>🏥</Text>
            <Text style={styles.title}>Join Black Squirrel Health</Text>
            <Text style={styles.subtitle}>Let's get you set up! This'll be quick</Text>
          </View>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentStep + 1) / totalSteps) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.stepIndicator}>
              {currentStep + 1} / {totalSteps}
            </Text>
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            <View style={styles.questionBubble}>
              <Text style={styles.botAvatar}>💬</Text>
              <Text style={styles.questionText}>
                {questions[currentStep].question}
              </Text>
            </View>
          </View>

          {/* Answer Area */}
          <View style={styles.answerArea}>
            {renderInput()}

            <View style={styles.buttonRow}>
              {currentStep > 0 && (
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {!questions[currentStep].required && (
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.nextButton, { flex: currentStep === 0 ? 1 : 0 }]}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === totalSteps - 1 ? 'Complete' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Member section */}
          <View style={styles.memberSection}>
            <Text style={styles.memberText}>Already got an account?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.memberLink}>Jump back to login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.black,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  chatContainer: {
    backgroundColor: COLORS.background.primary,
    margin: 20,
    borderRadius: 16,
    padding: 24,
    borderTopWidth: 3,
    borderTopColor: COLORS.accent.primary,
  },
  chatHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  botAvatar: {
    fontSize: 20,
    marginRight: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  answerArea: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 16,
  },
  measurementInput: {
    marginBottom: 16,
  },
  unitSelector: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    padding: 4,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  unitBtnActive: {
    backgroundColor: COLORS.accent.primary,
  },
  unitBtnText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  unitBtnTextActive: {
    color: COLORS.text.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    backgroundColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  skipButton: {
    backgroundColor: COLORS.background.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  skipButtonText: {
    color: COLORS.text.tertiary,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: COLORS.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
  },
  nextButtonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  memberSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  memberText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginBottom: 4,
  },
  memberLink: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
});