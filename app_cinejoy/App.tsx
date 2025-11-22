import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { store } from "@/store";

import LoadingScreen from "@/screens/LoadingScreen";
import PosterScreen from "@/screens/PosterScreen";
import HomeScreen from "@/screens/HomeScreen";
import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import MovieDetailScreen from "@/screens/MovieDetailScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import MemberScreen from "@/screens/MemberScreen";
import BookTicketScreen from "@/screens/BookTicketScreen";
import SelectSeatScreen from "@/screens/SelectSeatScreen";
import ComboSelectionScreen from "@/screens/ComboSelectionScreen";
import PaymentScreen from "@/screens/PaymentScreen";
import PaymentResultScreen from "@/screens/PaymentResultScreen";
import BookingHistoryScreen from "@/screens/BookingHistoryScreen";
import BookingDetailScreen from "@/screens/BookingDetailScreen";
import BlogDetailScreen from "@/screens/BlogDetailScreen";
import HotNewsListScreen from "@/screens/HotNewsListScreen";
import AccountInfoScreen from "@/screens/AccountInfoScreen";
import ChangePasswordScreen from "@/screens/ChangePasswordScreen";
import MemberCardScreen from "@/screens/MemberCardScreen";
import CNJPointsScreen from "@/screens/CNJPointsScreen";
import VoucherScreen from "@/screens/VoucherScreen";
import ChatbotScreen from "@/screens/ChatbotScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import VersionInfoScreen from "@/screens/VersionInfoScreen";
import TermsOfUseScreen from "@/screens/TermsOfUseScreen";
import PaymentPolicyScreen from "@/screens/PaymentPolicyScreen";
import CompanyInfoScreen from "@/screens/CompanyInfoScreen";
import NotificationScreen from "@/screens/NotificationScreen";
import AppProvider from "@/components/AppProvider/AppProvider";

const Stack = createStackNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "#000000" }}
          edges={["bottom"]}
        >
          <AppProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="LoadingScreen"
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="LoadingScreen" component={LoadingScreen} />
                <Stack.Screen name="PosterScreen" component={PosterScreen} />
                <Stack.Screen name="HomeScreen" component={HomeScreen} />
                <Stack.Screen name="LoginScreen" component={LoginScreen} />
                <Stack.Screen
                  name="RegisterScreen"
                  component={RegisterScreen}
                />
                <Stack.Screen
                  name="MovieDetailScreen"
                  component={MovieDetailScreen}
                />
                <Stack.Screen
                  name="ForgotPasswordScreen"
                  component={ForgotPasswordScreen}
                />
                <Stack.Screen name="MemberScreen" component={MemberScreen} />
                <Stack.Screen
                  name="BookTicketScreen"
                  component={BookTicketScreen}
                />
                <Stack.Screen
                  name="SelectSeatScreen"
                  component={SelectSeatScreen}
                />
                <Stack.Screen
                  name="ComboSelectionScreen"
                  component={ComboSelectionScreen}
                />
                <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
                <Stack.Screen
                  name="PaymentResultScreen"
                  component={PaymentResultScreen}
                />
                <Stack.Screen
                  name="BookingHistoryScreen"
                  component={BookingHistoryScreen}
                />
                <Stack.Screen
                  name="BookingDetailScreen"
                  component={BookingDetailScreen}
                />
                <Stack.Screen
                  name="BlogDetailScreen"
                  component={BlogDetailScreen}
                />
                <Stack.Screen
                  name="HotNewsListScreen"
                  component={HotNewsListScreen}
                />
                <Stack.Screen
                  name="AccountInfoScreen"
                  component={AccountInfoScreen}
                />
                <Stack.Screen
                  name="ChangePasswordScreen"
                  component={ChangePasswordScreen}
                />
                <Stack.Screen
                  name="MemberCardScreen"
                  component={MemberCardScreen}
                />
                <Stack.Screen
                  name="CNJPointsScreen"
                  component={CNJPointsScreen}
                />
                <Stack.Screen name="VoucherScreen" component={VoucherScreen} />
                <Stack.Screen name="ChatbotScreen" component={ChatbotScreen} />
                <Stack.Screen
                  name="SettingsScreen"
                  component={SettingsScreen}
                />
                <Stack.Screen
                  name="VersionInfoScreen"
                  component={VersionInfoScreen}
                />
                <Stack.Screen
                  name="TermsOfUseScreen"
                  component={TermsOfUseScreen}
                />
                <Stack.Screen
                  name="PaymentPolicyScreen"
                  component={PaymentPolicyScreen}
                />
                <Stack.Screen
                  name="CompanyInfoScreen"
                  component={CompanyInfoScreen}
                />
                <Stack.Screen
                  name="NotificationScreen"
                  component={NotificationScreen}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </AppProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </Provider>
  );
}
