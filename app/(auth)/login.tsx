import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) return;
    setErrorMessage(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace('/');
    setLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 pt-6 justify-between pb-10">
          {/* Header */}
          <View className="gap-2">
            <TouchableOpacity onPress={() => router.back()} className="mb-4">
              <Text className="text-gold text-sm">← Back</Text>
            </TouchableOpacity>
            <Text className="text-white text-3xl font-bold">Welcome back</Text>
            <Text className="text-white/50 text-sm">Continue where you left off.</Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-white/50 text-xs tracking-widest uppercase">Email</Text>
              <TextInput
                className="bg-surface-raised border border-surface-border rounded-xl px-4 py-4 text-white text-base"
                placeholder="you@domain.com"
                placeholderTextColor="#444"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View className="gap-2">
              <Text className="text-white/50 text-xs tracking-widest uppercase">Password</Text>
              <TextInput
                className="bg-surface-raised border border-surface-border rounded-xl px-4 py-4 text-white text-base"
                placeholder="Password"
                placeholderTextColor="#444"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {/* Submit */}
          <View className="gap-3">
            {errorMessage ? <Text className="text-red-400 text-sm text-center">{errorMessage}</Text> : null}
            <TouchableOpacity
              className="bg-gold rounded-2xl py-4 items-center"
              onPress={handleLogin}
              disabled={loading || !email || !password}
              activeOpacity={0.85}
              style={{ opacity: loading || !email || !password ? 0.5 : 1 }}
            >
              <Text className="text-surface font-bold text-base tracking-wide">
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
