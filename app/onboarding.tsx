import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { calculateOnboardingResult, detectPhase } from '../lib/onboarding';
import { trackEvent } from '../lib/analytics';
import { claimUsername, isUsernameAvailable, normalizeUsernameInput, usernameValidationError } from '../lib/username';
import type { OnboardingAnswer, OnboardingResult } from '../types';
import type { Json } from '../types/database';

// 12 questions to detect phase and pillar priorities
const QUESTIONS = [
  {
    id: 'q1',
    text: 'Right now, how clear are you on what you actually want in life?',
    options: ['Completely lost', 'Some idea, lots of fog', 'Getting clearer', 'Crystal clear'],
  },
  {
    id: 'q2',
    text: 'How would you rate your energy and physical health on a typical day?',
    options: ['Depleted', 'Below average', 'Decent', 'Excellent'],
  },
  {
    id: 'q3',
    text: 'Your career or craft — where does it stand?',
    options: ['Stagnant or wrong path', 'Moving but unfocused', 'On track', 'Thriving and building'],
  },
  {
    id: 'q4',
    text: 'How are your key relationships (partner, family, close friends)?',
    options: ['Strained or isolated', 'Mediocre, surface-level', 'Solid with room to grow', 'Deep and nourishing'],
  },
  {
    id: 'q5',
    text: 'Do you have control over your emotions under pressure?',
    options: ['Rarely', 'Sometimes', 'Mostly', 'Consistently'],
  },
  {
    id: 'q6',
    text: 'Your finances — where are you?',
    options: ['Living paycheck to paycheck', 'Stable but not building wealth', 'Saving and investing', 'Building significant wealth'],
  },
  {
    id: 'q7',
    text: 'When did you last do something that genuinely excited or challenged you?',
    options: ['Can\'t remember', 'Months ago', 'Recently', 'Regularly'],
  },
  {
    id: 'q8',
    text: 'How much of your day do you spend in focused, deep work?',
    options: ['Almost none', 'An hour or less', '2–4 hours', '4+ hours'],
  },
  {
    id: 'q9',
    text: 'Which area feels most broken right now?',
    options: ['Health / Body', 'Mind / Focus', 'Career / Craft', 'Relationships'],
  },
  {
    id: 'q10',
    text: 'Which area feels most broken right now? (continued)',
    options: ['Finances', 'Emotional resilience', 'Sense of adventure / purpose', 'Multiple areas equally'],
  },
  {
    id: 'q11',
    text: 'What\'s your primary motivation for being here?',
    options: ['I\'m in crisis and need out', 'I\'m drifting and need direction', 'I\'m good but want to be great', 'I\'m already high-performing, need edge'],
  },
  {
    id: 'q12',
    text: 'How consistent are you with self-improvement practices right now?',
    options: ['Never / just starting', 'Sporadic', 'Regular but disorganized', 'Systematic and disciplined'],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { user, loadProfile } = useAuthStore();
  const [step, setStep] = useState(-1); // -1 = intro, 0 = username, 1-12 = questions, 13 = done
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<OnboardingResult | null>(null);

  const isIntro = step === -1;
  const isUsername = step === 0;
  const isDone = step > QUESTIONS.length;
  const question = QUESTIONS[Math.max(0, step - 1)];

  useEffect(() => {
    if (!isUsername) return;
    const validationError = usernameValidationError(username);
    if (validationError) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const timer = setTimeout(() => {
      isUsernameAvailable(username)
        .then((available) => setUsernameStatus(available ? 'available' : 'taken'))
        .catch(() => setUsernameStatus('idle'));
    }, 350);
    return () => clearTimeout(timer);
  }, [isUsername, username]);

  const handleAnswer = (index: number) => {
    setSelectedOption(index);
    Haptics.selectionAsync();
  };

  const handleNext = async () => {
    if (isIntro) {
      setStep(0);
      return;
    }

    if (isUsername) {
      const validationError = usernameValidationError(username);
      if (validationError) {
        Alert.alert('Choose another username', validationError);
        return;
      }
      setUsernameStatus('checking');
      try {
        const available = await isUsernameAvailable(username);
        setUsernameStatus(available ? 'available' : 'taken');
        if (!available) return;
        setStep(1);
      } catch {
        setUsernameStatus('idle');
        Alert.alert('Could not check username', 'Please try again.');
      }
      return;
    }

    if (selectedOption === null) return;

    const newAnswers = [
      ...answers.filter((a) => a.questionId !== question.id),
      { questionId: question.id, answer: selectedOption },
    ];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (step < QUESTIONS.length) {
      setStep(step + 1);
    } else {
      try {
        await finishOnboarding(newAnswers);
      } catch (error) {
        setSaving(false);
        Alert.alert('Could not save onboarding', error instanceof Error ? error.message : 'Please try again.');
      }
    }
  };

  const finishOnboarding = async (finalAnswers: OnboardingAnswer[]) => {
    if (!user?.id) return;
    setSaving(true);

    const onboardingResult = calculateOnboardingResult(finalAnswers);
    const { phase, topPillars: activePillars, initialScores: pillarScores } = onboardingResult;

    await claimUsername(username);

    // Save profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email!,
      phase,
      level: '1.0',
      active_pillars: activePillars,
      onboarding_complete: true,
    });
    if (profileError) throw profileError;

    const { error: scoresError } = await supabase.rpc('set_pillar_scores', {
      p_user_id: user.id,
      p_pillar_scores: pillarScores as unknown as Json,
    });
    if (scoresError) throw scoresError;

    // Save answers
    const answerRows = finalAnswers.map((a) => ({
      user_id: user.id,
      question_id: a.questionId,
      answer: String(a.answer),
    }));
    const { error: answersError } = await supabase
      .from('onboarding_answers')
      .upsert(answerRows, { onConflict: 'user_id,question_id' });
    if (answersError) throw answersError;

    await loadProfile(user.id);
    void trackEvent(user.id, 'onboarding_completed', { phase, active_pillars: activePillars });
    setResult(onboardingResult);
    setSaving(false);
    setStep(QUESTIONS.length + 1);
  };

  if (isDone) {
    const phase = result?.phase ?? detectPhase(answers);
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-8">
        <Text className="text-5xl mb-6">⚡</Text>
        <Text className="text-gold text-xs tracking-widest uppercase mb-3">
          Initiation Complete
        </Text>
        <Text className="text-white text-3xl font-bold text-center mb-4">
          Phase:{' '}
          <Text className="capitalize">{phase}</Text>
        </Text>
        <Text className="text-white/50 text-base text-center mb-10 leading-relaxed">
          Your profile has been calibrated. Your first directive awaits. The work begins now.
        </Text>
        <TouchableOpacity
          className="bg-gold rounded-2xl py-4 px-10"
          onPress={() => router.replace('/(app)')}
        >
          <Text className="text-surface font-bold text-base">Enter the Arena</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (saving) {
    return (
      <View className="flex-1 bg-surface items-center justify-center gap-4">
        <ActivityIndicator color="#C9A84C" size="large" />
        <Text className="text-white/50 text-sm">Calibrating your profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Progress */}
      {!isIntro && !isUsername && (
        <View className="h-1 bg-surface-border mx-6 mt-4 rounded-full">
          <View
            className="h-1 bg-gold rounded-full"
            style={{ width: `${((step) / QUESTIONS.length) * 100}%` }}
          />
        </View>
      )}

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isIntro ? (
          <View className="flex-1 justify-between">
            <View className="gap-6 mt-8">
              <Text className="text-gold text-xs tracking-[6px] uppercase">
                Initiation Assessment
              </Text>
              <Text className="text-white text-3xl font-bold leading-tight">
                12 questions.{'\n'}No bullshit.{'\n'}Real calibration.
              </Text>
              <Text className="text-white/50 text-base leading-relaxed">
                This determines your current phase, your weakest pillars, and your first directive. Be honest — this only works if you are.
              </Text>
              <Text className="text-white/30 text-sm">
                Takes about 2 minutes.
              </Text>
            </View>
            <TouchableOpacity
              className="bg-gold rounded-2xl py-4 items-center mt-10"
              onPress={handleNext}
            >
              <Text className="text-surface font-bold text-base">Start Assessment</Text>
            </TouchableOpacity>
          </View>
        ) : isUsername ? (
          <View className="flex-1 justify-between">
            <View className="gap-6 mt-8">
              <Text className="text-gold text-xs tracking-[6px] uppercase">Claim your identity</Text>
              <Text className="text-white text-3xl font-bold leading-tight">Choose your{`\n`}username.</Text>
              <Text className="text-white/50 text-base leading-relaxed">
                This is your unique public handle, like on Instagram or X. You can change it later in your profile.
              </Text>
              <View>
                <View className="bg-surface-raised border border-surface-border rounded-2xl px-4 flex-row items-center">
                  <Text className="text-gold text-lg font-bold">@</Text>
                  <TextInput
                    className="flex-1 text-white text-lg py-4 ml-1"
                    placeholder="username"
                    placeholderTextColor="#555"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={30}
                    value={username}
                    onChangeText={(value) => setUsername(normalizeUsernameInput(value))}
                    accessibilityLabel="Username"
                  />
                </View>
                <Text className="text-white/30 text-xs mt-3">3–30 characters · letters, numbers, _ and .</Text>
                {usernameStatus === 'checking' && <Text className="text-white/40 text-sm mt-3">Checking availability…</Text>}
                {usernameStatus === 'available' && <Text className="text-emerald-400 text-sm mt-3">@{username} is available.</Text>}
                {usernameStatus === 'taken' && <Text className="text-red-400 text-sm mt-3">@{username} is already taken.</Text>}
              </View>
            </View>
            <TouchableOpacity
              className="bg-gold rounded-2xl py-4 items-center mt-10"
              onPress={handleNext}
              disabled={usernameStatus !== 'available'}
              style={{ opacity: usernameStatus === 'available' ? 1 : 0.35 }}
            >
              <Text className="text-surface font-bold text-base">Continue →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1 justify-between">
            {/* Question */}
            <View className="gap-6 mt-6">
              <Text className="text-white/30 text-xs tracking-widest">
                {step} / {QUESTIONS.length}
              </Text>
              <Text className="text-white text-xl font-bold leading-snug">
                {question.text}
              </Text>

              <View className="gap-3 mt-2">
                {question.options.map((option, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleAnswer(i)}
                    className="rounded-2xl px-5 py-4"
                    style={{
                      backgroundColor:
                        selectedOption === i ? '#C9A84C22' : '#1A1A1A',
                      borderWidth: 1.5,
                      borderColor:
                        selectedOption === i ? '#C9A84C' : '#2A2A2A',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: selectedOption === i ? '#C9A84C' : '#888',
                      }}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Next */}
            <TouchableOpacity
              className="bg-gold rounded-2xl py-4 items-center mt-8"
              onPress={handleNext}
              disabled={selectedOption === null}
              style={{ opacity: selectedOption === null ? 0.3 : 1 }}
            >
              <Text className="text-surface font-bold">
                {step === QUESTIONS.length ? 'Finish' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
