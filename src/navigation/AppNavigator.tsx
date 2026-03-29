import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import EmployeeDashboard from '../screens/EmployeeDashboard';
import SubmitExpenseScreen from '../screens/SubmitExpenseScreen';
import MyExpensesScreen from '../screens/MyExpensesScreen';
import ManagerDashboard from '../screens/ManagerDashboard';
import PendingApprovalsScreen from '../screens/PendingApprovalsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function EmployeeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            Dashboard: '🏠',
            Submit: '➕',
            History: '📋',
          };
          return <Text style={{ fontSize: 24 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={EmployeeDashboard} />
      <Tab.Screen name="Submit" component={SubmitExpenseScreen} />
      <Tab.Screen name="History" component={MyExpensesScreen} />
    </Tab.Navigator>
  );
}

function ManagerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            Dashboard: '🏠',
            Review: '✅',
          };
          return <Text style={{ fontSize: 24 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={ManagerDashboard} />
      <Tab.Screen
        name="Review"
        component={PendingApprovalsScreen}
        options={{ title: 'Pending Approval' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();

  if (!user) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user.role === 'employee' ? (
          <>
            <Stack.Screen name="EmployeeHome" component={EmployeeTabs} />
            <Stack.Screen
              name="SubmitExpense"
              component={SubmitExpenseScreen}
              options={{
                headerShown: true,
                title: 'Submit Expense',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="MyExpenses"
              component={MyExpensesScreen}
              options={{
                headerShown: true,
                title: 'My Expenses',
              }}
            />
          </>
        ) : user.role === 'manager' ? (
          <>
            <Stack.Screen name="ManagerHome" component={ManagerTabs} />
            <Stack.Screen
              name="PendingApprovals"
              component={PendingApprovalsScreen}
              options={{
                headerShown: true,
                title: 'Pending Approvals',
              }}
            />
          </>
        ) : (
          // Admin sees manager view for now
          <>
            <Stack.Screen name="AdminHome" component={ManagerTabs} />
            <Stack.Screen
              name="PendingApprovals"
              component={PendingApprovalsScreen}
              options={{
                headerShown: true,
                title: 'Pending Approvals',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
