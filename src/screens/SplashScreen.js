import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.3);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Check authentication and navigate after delay
    const checkAuthAndNavigate = async () => {
      try {
        const isAuthenticated = await AsyncStorage.getItem('@user_authenticated');

        // Wait for 3 seconds to show splash screen
        setTimeout(() => {
          if (isAuthenticated === 'true') {
            navigation.replace('Main');
          } else {
            navigation.replace('Login');
          }
        }, 3000); // 3 second delay
      } catch (error) {
        console.error('Error checking authentication:', error);
        // Navigate to Login on error
        setTimeout(() => {
          navigation.replace('Login');
        }, 3000);
      }
    };

    checkAuthAndNavigate();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ImageBackground
        source={require('../../assets/kk.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {!logoError ? (
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>📋</Text>
              </View>
            )}
            <Text style={styles.title}>Attendance System</Text>
            <Text style={styles.subtitle}>Professional & Simple</Text>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(30, 58, 138, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  logoPlaceholder: {
    width: 200,
    height: 200,
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logoPlaceholderText: {
    fontSize: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#93c5fd',
    letterSpacing: 2,
  },
});

export default SplashScreen;
