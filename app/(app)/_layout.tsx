import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center gap-1 pt-1">
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text
        className="text-[10px] tracking-wide"
        style={{ color: focused ? '#C9A84C' : '#555' }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#2A2A2A',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚡" label="Today" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✓" label="Check-in" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pillars"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="◈" label="Pillars" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Audit" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="◎" label="Social" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="◉" label="Profile" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="integrations" options={{ href: null }} />
      <Tabs.Screen name="category/[categoryId]" options={{ href: null }} />
      <Tabs.Screen name="social-profile" options={{ href: null }} />
      <Tabs.Screen name="profile/[userId]" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="new-message" options={{ href: null }} />
      <Tabs.Screen name="post/[postId]" options={{ href: null }} />
      <Tabs.Screen name="chat/[conversationId]" options={{ href: null }} />
    </Tabs>
  );
}
