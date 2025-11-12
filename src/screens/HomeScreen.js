import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <Text style={styles.headerSubtitle}>Choose your option</Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.quickButton]}
          onPress={() => navigation.navigate('QuickID')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonIcon}>
            <Text style={styles.iconText}>🆔</Text>
          </View>
          <Text style={styles.buttonTitle}>Quick ID Entry</Text>
          <Text style={styles.buttonDescription}>
            Already registered? Enter your ID
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.fullButton]}
          onPress={() => navigation.navigate('FullRegistration')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonIcon}>
            <Text style={styles.iconText}>📝</Text>
          </View>
          <Text style={styles.buttonTitle}>Full Registration</Text>
          <Text style={styles.buttonDescription}>
            First time? Register with details
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tap to continue</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e3a8a',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#93c5fd',
  },
  buttonsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    justifyContent: 'center',
  },
  button: {
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 200,
    justifyContent: 'center',
  },
  quickButton: {
    backgroundColor: '#3b82f6',
  },
  fullButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonIcon: {
    marginBottom: 20,
  },
  iconText: {
    fontSize: 60,
  },
  buttonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#e0e7ff',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default HomeScreen;
