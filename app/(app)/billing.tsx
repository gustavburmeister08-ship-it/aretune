import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { BILLING_PLANS, openBillingPortal, startCheckout, type BillingPlan } from '../../lib/billing';

export default function BillingScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [busyPlan, setBusyPlan] = useState<BillingPlan | 'portal' | null>(null);

  const isPro = profile?.subscriptionTier === 'pro';

  const handleCheckout = async (plan: BillingPlan) => {
    setBusyPlan(plan);
    try {
      await startCheckout(plan);
    } catch (error) {
      Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyPlan(null);
    }
  };

  const handlePortal = async () => {
    setBusyPlan('portal');
    try {
      await openBillingPortal();
    } catch (error) {
      Alert.alert('Could not open billing portal', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyPlan(null);
    }
  };

  if (!profile) return null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-gold">Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold mb-2">Plan & Billing</Text>
        <Text className="text-white/50 text-sm leading-relaxed mb-6">
          Free includes basic tracking, 5 AI agent requests/day, and read-only community. Pro unlocks unlimited AI coaching, full tracking, and full community access.
        </Text>

        {profile.foundingMember && (
          <View className="bg-gold/10 border border-gold/40 rounded-2xl p-4 mb-6">
            <Text className="text-gold font-bold mb-1">⭑ Founding Member</Text>
            <Text className="text-white/60 text-xs">You were one of Aretune&apos;s first 100 members. This badge is permanent.</Text>
          </View>
        )}

        <View className="bg-surface-raised rounded-2xl p-5 mb-6">
          <Text className="text-white font-bold mb-1">Current plan</Text>
          <Text className="text-gold text-lg font-bold mb-1">{isPro ? 'Pro' : 'Free'}</Text>
          {isPro && profile.subscriptionPlan && (
            <Text className="text-white/40 text-xs capitalize">{profile.subscriptionPlan} billing{profile.subscriptionCurrentPeriodEnd ? ` · renews ${new Date(profile.subscriptionCurrentPeriodEnd).toLocaleDateString()}` : ''}</Text>
          )}
          {isPro && (
            <TouchableOpacity className="border border-gold rounded-xl py-3 items-center mt-4" onPress={handlePortal} disabled={busyPlan !== null}>
              {busyPlan === 'portal' ? <ActivityIndicator color="#C9A84C" /> : <Text className="text-gold font-bold">Manage subscription</Text>}
            </TouchableOpacity>
          )}
        </View>

        {!isPro && (
          <View className="gap-3 mb-6">
            {BILLING_PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                className="bg-surface-raised rounded-2xl p-5 flex-row items-center justify-between"
                style={plan.note ? { borderWidth: 1, borderColor: '#C9A84C' } : undefined}
                onPress={() => void handleCheckout(plan.id)}
                disabled={busyPlan !== null}
              >
                <View>
                  <Text className="text-white font-bold">{plan.label}</Text>
                  <Text className="text-white/40 text-sm mt-1">{plan.price}</Text>
                  {plan.note && <Text className="text-gold text-xs mt-1">{plan.note}</Text>}
                </View>
                {busyPlan === plan.id ? <ActivityIndicator color="#C9A84C" /> : <Text className="text-gold text-xl">›</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
