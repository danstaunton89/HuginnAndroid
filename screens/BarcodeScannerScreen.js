import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, Alert, Dimensions, Linking } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { COLORS } from '../config/theme';

export default function BarcodeScannerScreen({ navigation, route }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const device = useCameraDevice('back');
  const { returnScreen, context, userIngredientName } = route.params || {};

  useEffect(() => {
    const getCameraPermissions = async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');

      if (status === 'denied') {
        Alert.alert(
          'Camera Permission',
          'Camera permission is required to scan barcodes. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    };

    getCameraPermissions();
  }, []);

  // Search product by barcode (matching main app functionality)
  const searchByBarcode = async (barcode) => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/openfoodfacts/product/${barcode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404 || data.error === 'Product not found') {
          // Product not found - offer manual entry with barcode pre-filled
          Alert.alert(
            'Product Not Found',
            `No product found for barcode: ${barcode}. You can enter the details manually.`,
            [
              {
                text: 'Enter Manually',
                onPress: () => {
                  navigation.navigate('AddIngredient', {
                    scannedData: { barcode: barcode }
                  });
                }
              },
              {
                text: 'Try Again',
                onPress: () => setScanned(false)
              }
            ]
          );
          return;
        } else {
          throw new Error(data.error || `API error: ${response.status}`);
        }
      }

      if (data.product) {
        const productName = data.product.name || data.product.product_name || 'Unknown Product';

        // Extract nutrition data exactly like the main app
        const productData = {
          name: productName,
          brand: data.product.brand || '',
          size: data.product.serving_size || data.product.quantity || 100,
          size_unit: data.product.serving_unit || data.product.quantity_unit || 'g',
          calories: data.product.calories || data.product.nutriments?.['energy-kcal_100g'] || 0,
          protein: data.product.protein || data.product.nutriments?.proteins_100g || 0,
          carbs: data.product.carbs || data.product.nutriments?.carbohydrates_100g || 0,
          fat: data.product.fat || data.product.nutriments?.fat_100g || 0,
          fiber: data.product.fiber || data.product.nutriments?.fiber_100g || 0,
          sugar: data.product.sugar || data.product.nutriments?.sugars_100g || 0,
          sodium: data.product.sodium || data.product.nutriments?.sodium_100g || 0,
          barcode: barcode,
          source: 'openfoodfacts'
        };

        if (context === 'meal' || context === 'dashboard') {
          // For meals and dashboard: Navigate to quantity selector
          navigation.navigate('QuantitySelector', {
            product: productData,
            returnScreen,
            context,
            userIngredientName
          });
        } else {
          // For ingredients: Navigate directly to AddIngredient with scanned data
          navigation.navigate('AddIngredient', {
            scannedData: productData
          });
        }
      } else {
        Alert.alert('No Data', 'Product found but no nutrition data available. Please enter manually.');
        navigation.navigate('AddIngredient', {
          scannedData: { barcode: barcode }
        });
      }

    } catch (error) {
      Alert.alert(
        'Lookup Failed',
        `Failed to lookup product: ${error.message}. You can enter details manually.`,
        [
          {
            text: 'Enter Manually',
            onPress: () => {
              navigation.navigate('AddIngredient', {
                scannedData: { barcode: barcode }
              });
            }
          },
          {
            text: 'Try Again',
            onPress: () => setScanned(false)
          }
        ]
      );
    }
  };


  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39'],
    onCodeScanned: async (codes) => {
      if (scanned || codes.length === 0) return;

      const code = codes[0];
      setScanned(true);

      try {
        // Call the OpenFoodFacts API to lookup the product
        await searchByBarcode(code.value);
      } catch (error) {
        Alert.alert('Error', 'Failed to process barcode');
        setScanned(false);
      }
    }
  });

  const handleManualEntry = () => {
    Alert.prompt(
      'Enter Barcode',
      'Please enter the barcode manually:',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Submit',
          onPress: async (barcode) => {
            if (barcode && barcode.trim()) {
              await searchByBarcode(barcode.trim());
            }
          }
        }
      ],
      'plain-text'
    );
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.centerContent}>
          <Text style={styles.infoText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Barcode Scanner</Text>
          <TouchableOpacity onPress={() => {
            if (context === 'meal') {
              navigation.navigate('CreateMeal');
            } else if (context === 'dashboard') {
              navigation.navigate('Main', { screen: 'Dashboard' });
            } else {
              navigation.navigate(returnScreen || 'Main', returnScreen ? {} : { screen: 'Meals' });
            }
          }}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.errorText}>No access to camera</Text>
          <Text style={styles.infoText}>
            Camera permission is required to scan barcodes.
            Please enable camera access in your device settings.
          </Text>

          <TouchableOpacity
            style={styles.manualButton}
            onPress={handleManualEntry}
          >
            <Text style={styles.manualButtonText}>Enter Barcode Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan Barcode</Text>
        <TouchableOpacity onPress={() => {
          if (context === 'meal') {
            navigation.navigate('CreateMeal');
          } else if (context === 'dashboard') {
            navigation.navigate('Main', { screen: 'Dashboard' });
          } else {
            navigation.navigate(returnScreen || 'Main', returnScreen ? {} : { screen: 'Meals' });
          }
        }}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        {device && (
          <Camera
            style={styles.camera}
            device={device}
            isActive={true}
            codeScanner={codeScanner}
            torch={flashEnabled ? 'on' : 'off'}
          />
        )}

        {/* Scanning Overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {!scanned && <View style={styles.scanLine} />}
          </View>

          <Text style={styles.instructionText}>
            {scanned ? 'Barcode detected!' : 'Position barcode inside the frame'}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setFlashEnabled(!flashEnabled)}
        >
          <Text style={styles.controlButtonIcon}>🔦</Text>
          <Text style={styles.controlButtonText}>
            Flash {flashEnabled ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleManualEntry}
        >
          <Text style={styles.controlButtonIcon}>✏️</Text>
          <Text style={styles.controlButtonText}>Manual Entry</Text>
        </TouchableOpacity>

        {scanned && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.controlButtonIcon}>🔄</Text>
            <Text style={styles.controlButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');
const frameSize = Math.min(width * 0.8, 300);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.text.primary,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: frameSize,
    height: frameSize,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: COLORS.accent.primary,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    width: frameSize - 40,
    height: 2,
    backgroundColor: COLORS.accent.primary,
    position: 'absolute',
  },
  instructionText: {
    color: COLORS.text.primary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
  },
  controlButtonIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  controlButtonText: {
    color: COLORS.text.primary,
    fontSize: 12,
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  manualButton: {
    backgroundColor: COLORS.accent.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  manualButtonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});