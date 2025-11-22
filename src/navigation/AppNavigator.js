import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import MainScreen from '../screens/MainScreen';
import AttendanceEntryScreen from '../screens/AttendanceEntryScreen';
import ReportScreen from '../screens/ReportScreen';
import EmployeeManagementScreen from '../screens/EmployeeManagementScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Splash"
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainScreen} />
      <Stack.Screen
        name="AttendanceEntry"
        component={AttendanceEntryScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#1e3a8a',
          },
          headerTintColor: '#ffffff',
          headerTitle: 'Attendance Entry',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EmployeeManagement"
        component={EmployeeManagementScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
