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

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSignup = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) return;
    setFeedback(null);
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setFeedback('Use at least 8 characters with upper case, lower case, and a number.');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setFeedback(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace('/legal-consent' as never);
    } else {
      setFeedback('Account created. Sign in to continue.');
    }
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
            <Text className="text-white text-3xl font-bold">Create account</Text>
            <Text className="text-white/50 text-sm">
              Your ascent starts here. No fluff, no ads.
            </Text>
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
                placeholder="8+ characters"
                placeholderTextColor="#444"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {/* Submit */}
          <View className="gap-4">
            {feedback ? (
              <Text className="text-red-400 text-sm text-center">{feedback}</Text>
            ) : null}
            <TouchableOpacity
              className="bg-gold rounded-2xl py-4 items-center"
              onPress={handleSignup}
              disabled={loading || !email || !password}
              activeOpacity={0.85}
              style={{ opacity: loading || !email || !password ? 0.5 : 1 }}
            >
              <Text className="text-surface font-bold text-base tracking-wide">
                {loading ? 'Creating...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <Text className="text-white/30 text-xs text-center">
              By continuing, you accept the responsibility of becoming excellent.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
