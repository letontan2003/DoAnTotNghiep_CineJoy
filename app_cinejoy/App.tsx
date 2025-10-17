import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import HomeScreen from "./screens/HomeScreen";

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider >
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="HomeScreen"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
