import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LEGAL_TEXTS, type LegalDocument } from '../lib/legal';

export default function LegalDocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ document?: string }>();
  const key: LegalDocument = params.document === 'terms' || params.document === 'ai' ? params.document : 'privacy';
  const document = LEGAL_TEXTS[key];
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingVertical: 28 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6"><Text className="text-gold">Back</Text></TouchableOpacity>
        <Text className="text-white text-2xl font-bold mb-6">{document.title}</Text>
        <Text className="text-white/70 text-sm leading-relaxed">{document.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
