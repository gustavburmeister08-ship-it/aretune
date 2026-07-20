import { View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 px-6 justify-between py-12">
        {/* Top wordmark */}
        <View>
          <Text className="text-gold text-sm tracking-[6px] uppercase font-bold">
            Aretune
          </Text>
        </View>

        {/* Hero */}
        <View className="gap-6">
          <Text className="text-white text-5xl font-bold leading-tight">
            Become who{'\n'}you are{'\n'}capable of.
          </Text>
          <Text className="text-white/50 text-base leading-relaxed">
            A daily operating system for the elite few who refuse to coast.
            Track, diagnose, and sharpen every dimension of your life.
          </Text>
        </View>

        {/* CTA */}
        <View className="gap-3">
          <TouchableOpacity
            className="bg-gold rounded-2xl py-4 items-center"
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <Text className="text-surface font-bold text-base tracking-wide">
              Begin the Ascent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-2xl py-4 items-center border border-surface-border"
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text className="text-white/70 font-medium text-base">
              Already initiated? Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
