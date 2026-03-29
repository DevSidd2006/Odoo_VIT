import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Admin screens
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import ApprovalRulesScreen from '../screens/admin/ApprovalRulesScreen';
import ApprovalRuleFormScreen from '../screens/admin/ApprovalRuleFormScreen';

// Employee screens
import ExpenseListScreen from '../screens/employee/ExpenseListScreen';
import ExpenseFormScreen from '../screens/employee/ExpenseFormScreen';

// Manager screens
import ApprovalsDashboardScreen from '../screens/manager/ApprovalsDashboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: Colors.bg.secondary },
  headerTintColor: Colors.text.primary,
  headerTitleStyle: { fontWeight: '600' as const, color: Colors.text.primary },
  cardStyle: { backgroundColor: Colors.bg.primary },
};

const tabBarStyle = {
  backgroundColor: Colors.bg.secondary,
  borderTopColor: Colors.border.default,
  borderTopWidth: 1,
  paddingBottom: 8,
  paddingTop: 6,
  height: 64,
};

// ─── Auth Stack ───────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Create Company Account' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
    </Stack.Navigator>
  );
}

// ─── Admin Tabs ───────────────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle,
        tabBarActiveTintColor: Colors.accent.primary,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: Colors.bg.secondary },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: { color: Colors.text.primary, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = {
            Users: focused ? '👥' : '👤',
            'Approval Rules': focused ? '⚙️' : '🔧',
          };
          return <Text style={{ fontSize: 20 }}>{icons[route.name] ?? '📋'}</Text>;
        },
      })}
    >
      <Tab.Screen name="Users" component={UserManagementScreen} options={{ title: 'User Management' }} />
      <Tab.Screen name="Approval Rules" component={ApprovalRulesScreen} />
    </Tab.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ApprovalRuleForm" component={ApprovalRuleFormScreen} options={{ title: 'Approval Rule' }} />
    </Stack.Navigator>
  );
}

// ─── Employee Tabs ────────────────────────────────────────────────────────────
function EmployeeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ExpenseList" component={ExpenseListScreen} options={{ title: 'My Expenses' }} />
      <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: 'Expense' }} />
    </Stack.Navigator>
  );
}

// ─── Manager Tabs ─────────────────────────────────────────────────────────────
function ManagerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle,
        tabBarActiveTintColor: Colors.accent.primary,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: Colors.bg.secondary },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: { color: Colors.text.primary, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Approvals"
        component={ApprovalsDashboardScreen}
        options={{
          title: 'Approvals',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20 }}>{focused ? '✅' : '☑️'}</Text>,
        }}
      />
      <Tab.Screen
        name="MyExpenses"
        component={ExpenseListScreen}
        options={{
          title: 'My Expenses',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20 }}>{focused ? '🧾' : '📄'}</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? (
        <AuthStack />
      ) : session.role === 'admin' ? (
        <AdminStack />
      ) : session.role === 'manager' ? (
        <ManagerTabs />
      ) : (
        <EmployeeStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
