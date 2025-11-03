import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Provider } from 'react-redux';
import { store } from '@/store';

import LoadingScreen from "@/screens/LoadingScreen";
import PosterScreen from "@/screens/PosterScreen";
import HomeScreen from "@/screens/HomeScreen";
import AppProvider from "@/components/AppProvider/AppProvider";

const Stack = createStackNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }} edges={['bottom']}>
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
              </Stack.Navigator>
            </NavigationContainer>
          </AppProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </Provider>
  );
}
