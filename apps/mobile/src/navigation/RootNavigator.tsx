import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Icon } from "react-native-paper";
import { colors } from "@tegang/design-tokens";
import { useMobileStore } from "../stores/mobile-store";
import { AssessmentResultScreen } from "../screens/AssessmentResultScreen";
import { AssessmentHubScreen } from "../screens/AssessmentHubScreen";
import { AssessmentScreen } from "../screens/AssessmentScreen";
import { CompletionScreen } from "../screens/CompletionScreen";
import { ForbiddenScreen } from "../screens/ForbiddenScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LearningScreen } from "../screens/LearningScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RemedialScreen } from "../screens/RemedialScreen";
import { TrainingDetailScreen } from "../screens/TrainingDetailScreen";
import { TrainingListScreen } from "../screens/TrainingListScreen";
import { TutorHubScreen } from "../screens/TutorHubScreen";
import { TutorScreen } from "../screens/TutorScreen";
import type { MainTabParamList, RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, string> = {
  TrainingHome: "book-open-page-variant-outline",
  AssessmentHub: "clipboard-check-outline",
  TutorHub: "message-processing-outline",
  Messages: "bell-outline",
  Profile: "account-outline"
};

const tabLabels: Record<keyof MainTabParamList, string> = {
  TrainingHome: "我的培训",
  AssessmentHub: "测评与结果",
  TutorHub: "智能问答",
  Messages: "消息",
  Profile: "我的"
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabel: tabLabels[route.name],
        tabBarIcon: ({ color, size }) => (
          <Icon source={tabIcons[route.name]} color={color} size={size} />
        ),
        tabBarStyle: {
          minHeight: 68,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopColor: colors.border,
          backgroundColor: colors.surface
        }
      })}
    >
      <Tabs.Screen name="TrainingHome" component={HomeScreen} />
      <Tabs.Screen name="AssessmentHub" component={AssessmentHubScreen} />
      <Tabs.Screen name="TutorHub" component={TutorHubScreen} />
      <Tabs.Screen name="Messages" component={MessagesScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const authenticated = useMobileStore((state) => state.authenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right"
      }}
    >
      {!authenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TrainingList"
            component={TrainingListScreen}
            options={{ title: "全部培训" }}
          />
          <Stack.Screen
            name="TrainingDetail"
            component={TrainingDetailScreen}
            options={{ title: "培训任务详情" }}
          />
          <Stack.Screen
            name="Learning"
            component={LearningScreen}
            options={{ title: "课程学习" }}
          />
          <Stack.Screen
            name="Tutor"
            component={TutorScreen}
            options={{ title: "智能辅导" }}
          />
          <Stack.Screen
            name="Assessment"
            component={AssessmentScreen}
            options={{ title: "培训测评" }}
          />
          <Stack.Screen
            name="AssessmentResult"
            component={AssessmentResultScreen}
            options={{ title: "测评结果" }}
          />
          <Stack.Screen
            name="Remedial"
            component={RemedialScreen}
            options={{ title: "定向补训" }}
          />
          <Stack.Screen
            name="Completion"
            component={CompletionScreen}
            options={{ title: "培训完成" }}
          />
          <Stack.Screen
            name="Forbidden"
            component={ForbiddenScreen}
            options={{ title: "访问受限" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
