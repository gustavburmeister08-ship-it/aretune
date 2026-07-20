const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const SYSTEM_PROMPT = `You are the Aretune coaching engine: direct, precise, practical, and focused on measurable growth across Body, Mind, Spirit, Relationships, Vocation, and Lore. Use only supplied user data. Never diagnose medical or mental-health conditions. Never promise financial outcomes. Recommend professional help for immediate safety risks.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, ...headers } });
}

function bearerToken(request) {
  const value = request.headers.get('Authorization');
  if (!value?.startsWith('Bearer ')) throw new Error('AUTH:Missing bearer token');
  return value.slice(7).trim();
}

async function supabaseRequest(env, path, init = {}, userToken) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.SUPABASE_URL || !key) throw new Error('Supabase is not configured');
  return fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${userToken ?? key}`,
      ...(init.headers ?? {}),
    },
  });
}

async function authenticatedUser(request, env) {
  const token = bearerToken(request);
  const response = await supabaseRequest(env, '/auth/v1/user', {}, token);
  if (!response.ok) throw new Error('AUTH:Invalid or expired access token');
  const user = await response.json();
  if (!user?.id) throw new Error('AUTH:Invalid or expired access token');
  return { id: user.id, token };
}

const oauthProviders = {
  strava: { authUrl: 'https://www.strava.com/oauth/authorize', tokenUrl: 'https://www.strava.com/api/v3/oauth/token', scope: 'activity:read_all', clientId: 'STRAVA_CLIENT_ID', clientSecret: 'STRAVA_CLIENT_SECRET' },
  oura: { authUrl: 'https://cloud.ouraring.com/oauth/authorize', tokenUrl: 'https://api.ouraring.com/oauth/token', scope: 'daily heartrate workout session', clientId: 'OURA_CLIENT_ID', clientSecret: 'OURA_CLIENT_SECRET' },
  whoop: { authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth', tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token', scope: 'read:recovery read:cycles read:sleep read:workout read:body_measurement', clientId: 'WHOOP_CLIENT_ID', clientSecret: 'WHOOP_CLIENT_SECRET' },
  fitbit: { authUrl: 'https://www.fitbit.com/oauth2/authorize', tokenUrl: 'https://api.fitbit.com/oauth2/token', scope: 'activity heartrate sleep weight', clientId: 'FITBIT_CLIENT_ID', clientSecret: 'FITBIT_CLIENT_SECRET', basicAuth: true },
  withings: { authUrl: 'https://account.withings.com/oauth2_user/authorize2', tokenUrl: 'https://wbsapi.withings.net/v2/oauth2', scope: 'user.info,user.metrics,user.activity', clientId: 'WITHINGS_CLIENT_ID', clientSecret: 'WITHINGS_CLIENT_SECRET', tokenAction: true },
  polar: { authUrl: 'https://flow.polar.com/oauth2/authorization', tokenUrl: 'https://polarremote.com/v2/oauth2/token', scope: 'accesslink.read_all', clientId: 'POLAR_CLIENT_ID', clientSecret: 'POLAR_CLIENT_SECRET', basicAuth: true },
  dexcom: { authUrl: 'https://api.dexcom.com/v3/oauth2/login', tokenUrl: 'https://api.dexcom.com/v3/oauth2/token', scope: 'offline_access', clientId: 'DEXCOM_CLIENT_ID', clientSecret: 'DEXCOM_CLIENT_SECRET' },
};

const toBase64Url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const bytesToHex = (bytes) => [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');

async function stateHash(value) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function encryptionKey(env) {
  if (!env.INTEGRATION_ENCRYPTION_KEY) throw new Error('Integration encryption is not configured');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.INTEGRATION_ENCRYPTION_KEY));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptSecret(env, value) {
  if (!value) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(env), new TextEncoder().encode(value));
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function decryptSecret(env, value) {
  if (!value) return null;
  const [iv, encrypted] = value.split('.').map(fromBase64Url);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await encryptionKey(env), encrypted);
  return new TextDecoder().decode(plain);
}

function providerConfig(env, providerId) {
  const definition = oauthProviders[providerId];
  if (!definition) throw new Error('This provider uses file, device, FHIR, or partner access instead of OAuth');
  const clientId = env[definition.clientId];
  const clientSecret = env[definition.clientSecret];
  if (!clientId || !clientSecret) throw new Error(`SETUP:${providerId} provider credentials are not configured yet. CSV / JSON import is available now.`);
  return { ...definition, clientId, clientSecret };
}

async function handleIntegrationConnect(request, env, providerId) {
  const user = await authenticatedUser(request, env);
  const provider = providerConfig(env, providerId);
  const state = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const appUrl = env.APP_URL ?? 'https://app.aretune.com';
  const redirectUri = `${appUrl}/api/integrations/${encodeURIComponent(providerId)}/callback`;
  const insert = await supabaseRequest(env, '/rest/v1/integration_oauth_states', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ state_hash: await stateHash(state), user_id: user.id, provider_id: providerId, redirect_uri: redirectUri, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() }),
  });
  if (!insert.ok) throw new Error('Unable to create secure connection state');
  const params = new URLSearchParams({ response_type: 'code', client_id: provider.clientId, redirect_uri: redirectUri, scope: provider.scope, state });
  return json({ authorizationUrl: `${provider.authUrl}?${params}` });
}

async function exchangeOAuthCode(provider, code, redirectUri, refreshToken) {
  const body = new URLSearchParams(refreshToken
    ? { grant_type: 'refresh_token', refresh_token: refreshToken }
    : { grant_type: 'authorization_code', code, redirect_uri: redirectUri });
  if (!provider.basicAuth) { body.set('client_id', provider.clientId); body.set('client_secret', provider.clientSecret); }
  if (provider.tokenAction) body.set('action', refreshToken ? 'refreshaccesstoken' : 'requesttoken');
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (provider.basicAuth) headers.Authorization = `Basic ${btoa(`${provider.clientId}:${provider.clientSecret}`)}`;
  const response = await fetch(provider.tokenUrl, { method: 'POST', headers, body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) throw new Error(`Provider token exchange failed: ${result.error_description ?? result.error ?? response.status}`);
  return result.body ?? result;
}

async function handleIntegrationCallback(request, env, providerId) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state'); const code = url.searchParams.get('code');
  if (!state || !code) throw new Error(`Provider authorization was cancelled: ${url.searchParams.get('error') ?? 'missing response'}`);
  const hash = await stateHash(state);
  const stateResponse = await supabaseRequest(env, `/rest/v1/integration_oauth_states?state_hash=eq.${encodeURIComponent(hash)}&provider_id=eq.${encodeURIComponent(providerId)}&select=*`);
  if (!stateResponse.ok) throw new Error('Unable to validate connection state');
  const stored = (await stateResponse.json())[0];
  if (!stored || new Date(stored.expires_at).getTime() < Date.now()) throw new Error('Connection request expired. Start again from the app.');
  const provider = providerConfig(env, providerId);
  const tokens = await exchangeOAuthCode(provider, code, stored.redirect_uri);
  if (!tokens.access_token) throw new Error('Provider did not return an access token');

  const connectionResponse = await supabaseRequest(env, '/rest/v1/integration_connections?on_conflict=user_id,provider_id', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ user_id: stored.user_id, provider_id: providerId, connection_mode: 'oauth', status: 'active', display_name: providerId[0].toUpperCase() + providerId.slice(1), scopes: provider.scope.split(/[ ,]+/), last_error: null, updated_at: new Date().toISOString() }),
  });
  if (!connectionResponse.ok) throw new Error('Unable to save provider connection');
  const connection = (await connectionResponse.json())[0];
  const credentialResponse = await supabaseRequest(env, '/rest/v1/integration_credentials?on_conflict=connection_id', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ connection_id: connection.id, encrypted_access_token: await encryptSecret(env, tokens.access_token), encrypted_refresh_token: await encryptSecret(env, tokens.refresh_token), expires_at: tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString() : null, provider_user_id: String(tokens.athlete?.id ?? tokens.user_id ?? tokens.userid ?? '') || null, updated_at: new Date().toISOString() }),
  });
  if (!credentialResponse.ok) throw new Error('Unable to store encrypted provider credentials');
  await supabaseRequest(env, `/rest/v1/integration_oauth_states?state_hash=eq.${encodeURIComponent(hash)}`, { method: 'DELETE' });
  const appUrl = env.APP_URL ?? 'https://app.aretune.com';
  const webAppUrl = env.WEB_APP_URL ?? appUrl;
  return Response.redirect(`${webAppUrl}/integrations?connected=${encodeURIComponent(providerId)}`, 302);
}

const dateOnly = (date) => date.toISOString().slice(0, 10);
const normalized = (provider, type, value, occurredAt, suffix, unit) => ({ id: `${provider}-${suffix}`, type, value: Number(value), unit, occurredAt: new Date(occurredAt).toISOString(), payload: {} });

async function fetchProviderEvents(providerId, token) {
  const start = new Date(Date.now() - 30 * 86_400_000); const end = new Date();
  const auth = { Authorization: `Bearer ${token}` };
  if (providerId === 'strava') {
    const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(start.getTime() / 1000)}&per_page=100`, { headers: auth });
    if (!response.ok) throw new Error(`Strava sync failed (${response.status})`);
    return (await response.json()).flatMap((activity) => [
      normalized('strava', 'workout', 1, activity.start_date, `${activity.id}-workout`, 'session'),
      normalized('strava', 'workout_minutes', Number(activity.moving_time ?? 0) / 60, activity.start_date, `${activity.id}-duration`, 'min'),
    ]);
  }
  if (providerId === 'oura') {
    const base = 'https://api.ouraring.com/v2/usercollection'; const query = `start_date=${dateOnly(start)}&end_date=${dateOnly(end)}`;
    const [sleepResponse, readinessResponse, workoutResponse] = await Promise.all([fetch(`${base}/daily_sleep?${query}`, { headers: auth }), fetch(`${base}/daily_readiness?${query}`, { headers: auth }), fetch(`${base}/workout?${query}`, { headers: auth })]);
    if (![sleepResponse, readinessResponse, workoutResponse].every((response) => response.ok)) throw new Error('Oura sync failed');
    const sleep = (await sleepResponse.json()).data ?? []; const readiness = (await readinessResponse.json()).data ?? []; const workouts = (await workoutResponse.json()).data ?? [];
    return [...sleep.map((item) => normalized('oura', 'sleep_score', item.score, item.day, `${item.id ?? item.day}-sleep`, 'score')), ...readiness.map((item) => normalized('oura', 'recovery_score', item.score, item.day, `${item.id ?? item.day}-readiness`, 'score')), ...workouts.flatMap((item) => [normalized('oura', 'workout', 1, item.start_datetime, `${item.id}-workout`, 'session'), normalized('oura', 'workout_minutes', (new Date(item.end_datetime) - new Date(item.start_datetime)) / 60_000, item.start_datetime, `${item.id}-duration`, 'min')])];
  }
  if (providerId === 'whoop') {
    const query = `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}&limit=100`;
    const [recoveryResponse, sleepResponse, workoutResponse] = await Promise.all([fetch(`https://api.prod.whoop.com/developer/v2/recovery?${query}`, { headers: auth }), fetch(`https://api.prod.whoop.com/developer/v2/activity/sleep?${query}`, { headers: auth }), fetch(`https://api.prod.whoop.com/developer/v2/activity/workout?${query}`, { headers: auth })]);
    if (![recoveryResponse, sleepResponse, workoutResponse].every((response) => response.ok)) throw new Error('WHOOP sync failed');
    const recoveries = (await recoveryResponse.json()).records ?? []; const sleeps = (await sleepResponse.json()).records ?? []; const workouts = (await workoutResponse.json()).records ?? [];
    return [...recoveries.flatMap((item) => [normalized('whoop', 'recovery_score', item.score?.recovery_score, item.created_at, `${item.cycle_id}-recovery`, 'score'), normalized('whoop', 'hrv_ms', Number(item.score?.hrv_rmssd_milli ?? 0), item.created_at, `${item.cycle_id}-hrv`, 'ms')]), ...sleeps.map((item) => normalized('whoop', 'sleep_duration_hours', Number(item.score?.stage_summary?.total_in_bed_time_milli ?? 0) / 3_600_000, item.start, `${item.id}-sleep`, 'hours')), ...workouts.flatMap((item) => [normalized('whoop', 'workout', 1, item.start, `${item.id}-workout`, 'session'), normalized('whoop', 'workout_minutes', (new Date(item.end) - new Date(item.start)) / 60_000, item.start, `${item.id}-duration`, 'min')])];
  }
  if (providerId === 'fitbit') {
    const [sleepResponse, activityResponse] = await Promise.all([fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${dateOnly(start)}/${dateOnly(end)}.json`, { headers: auth }), fetch(`https://api.fitbit.com/1/user/-/activities/list.json?afterDate=${dateOnly(start)}&sort=asc&offset=0&limit=100`, { headers: auth })]);
    if (!sleepResponse.ok || !activityResponse.ok) throw new Error('Fitbit sync failed');
    const sleeps = (await sleepResponse.json()).sleep ?? []; const activities = (await activityResponse.json()).activities ?? [];
    return [...sleeps.flatMap((item) => [normalized('fitbit', 'sleep_duration_hours', Number(item.duration ?? 0) / 3_600_000, item.startTime, `${item.logId}-sleep`, 'hours'), normalized('fitbit', 'sleep_score', item.efficiency, item.startTime, `${item.logId}-score`, 'score')]), ...activities.flatMap((item) => [normalized('fitbit', 'workout', 1, item.startTime, `${item.logId}-workout`, 'session'), normalized('fitbit', 'workout_minutes', item.activeDuration ? item.activeDuration / 60_000 : item.duration / 60_000, item.startTime, `${item.logId}-duration`, 'min')])];
  }
  throw new Error(`${providerId} automatic sync is awaiting provider approval. CSV / JSON import is available now.`);
}

async function handleIntegrationSync(request, env, providerId) {
  const user = await authenticatedUser(request, env);
  const connectionResponse = await supabaseRequest(env, `/rest/v1/integration_connections?user_id=eq.${encodeURIComponent(user.id)}&provider_id=eq.${encodeURIComponent(providerId)}&select=*`);
  const connection = connectionResponse.ok ? (await connectionResponse.json())[0] : null;
  if (!connection) throw new Error('Provider is not connected');
  const credentialResponse = await supabaseRequest(env, `/rest/v1/integration_credentials?connection_id=eq.${encodeURIComponent(connection.id)}&select=*`);
  const credential = credentialResponse.ok ? (await credentialResponse.json())[0] : null;
  if (!credential) throw new Error('Provider credentials are missing');
  let accessToken = await decryptSecret(env, credential.encrypted_access_token);
  if (credential.expires_at && new Date(credential.expires_at).getTime() < Date.now() + 60_000) {
    const refreshToken = await decryptSecret(env, credential.encrypted_refresh_token);
    if (!refreshToken) throw new Error('Provider session expired. Connect the account again.');
    const provider = providerConfig(env, providerId); const tokens = await exchangeOAuthCode(provider, '', '', refreshToken);
    accessToken = tokens.access_token;
    await supabaseRequest(env, `/rest/v1/integration_credentials?connection_id=eq.${encodeURIComponent(connection.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ encrypted_access_token: await encryptSecret(env, accessToken), encrypted_refresh_token: await encryptSecret(env, tokens.refresh_token ?? refreshToken), expires_at: tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString() : null, updated_at: new Date().toISOString() }) });
  }
  const events = (await fetchProviderEvents(providerId, accessToken)).filter((event) => Number.isFinite(event.value) && event.occurredAt);
  const ingest = await supabaseRequest(env, '/rest/v1/rpc/ingest_integration_events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_provider_id: providerId, p_mode: 'oauth', p_display_name: connection.display_name, p_events: events, p_source_name: 'Automatic OAuth sync' }) }, user.token);
  if (!ingest.ok) throw new Error(`Unable to import provider data: ${(await ingest.text()).slice(0, 300)}`);
  return json({ imported: await ingest.json(), received: events.length });
}

async function handleIntegrationDisconnect(request, env, providerId) {
  const user = await authenticatedUser(request, env);
  const response = await supabaseRequest(env, '/rest/v1/rpc/disconnect_integration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_provider_id: providerId }) }, user.token);
  if (!response.ok) throw new Error('Unable to disconnect provider');
  return json({ disconnected: true });
}

async function requireAiConsent(env, userId) {
  const response = await supabaseRequest(
    env,
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=ai_processing_consent`,
  );
  if (!response.ok) throw new Error('Unable to verify AI consent');
  const rows = await response.json();
  if (!rows[0]?.ai_processing_consent) throw new Error('AUTH:AI processing consent is required');
}

async function requireBudget(env, userId) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const response = await supabaseRequest(
    env,
    `/rest/v1/ai_usage_events?user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(start.toISOString())}&select=input_tokens,output_tokens`,
  );
  if (!response.ok) throw new Error('Unable to verify AI budget');
  const events = await response.json();
  const used = events.reduce((sum, event) => sum + event.input_tokens + event.output_tokens, 0);
  if (used >= Number(env.AI_DAILY_TOKEN_BUDGET ?? 50000)) throw new Error('BUDGET:Daily AI budget reached');
}

async function recordUsage(env, userId, route, provider, model, usage = {}) {
  const response = await supabaseRequest(env, '/rest/v1/ai_usage_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      route,
      provider,
      model,
      input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
    }),
  });
  if (!response.ok) throw new Error('Unable to record AI usage');
}

function parseModelJson(result) {
  if (result && typeof result === 'object' && result.response && typeof result.response === 'object') {
    return result.response;
  }
  const value = typeof result?.response === 'string' ? result.response : String(result ?? '');
  return JSON.parse(value.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim());
}

async function generateStructured(env, prompt, schema, maxTokens, temperature) {
  if (env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          temperature,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
          output_config: {
            format: {
              type: 'json_schema',
              schema,
            },
          },
        }),
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`HTTP ${response.status}: ${details.slice(0, 500)}`);
      }
      const result = await response.json();
      const text = result.content?.find((block) => block.type === 'text')?.text;
      if (!text) throw new Error('No text output');
      return {
        output: JSON.parse(text),
        usage: result.usage ?? {},
        provider: 'anthropic',
        model: ANTHROPIC_MODEL,
      };
    } catch (error) {
      // Keep AI features available during provider outages, invalid credentials, or quota issues.
      console.error(`Anthropic generation failed; using Workers AI fallback: ${String(error)}`);
    }
  }

  if (!env.AI) throw new Error('No AI provider is configured');
  const result = await env.AI.run(WORKERS_AI_MODEL, {
    messages: [{ role: 'user', content: `${SYSTEM_PROMPT}\n\n${prompt}` }],
    response_format: {
      type: 'json_schema',
      json_schema: schema,
    },
    max_tokens: maxTokens,
    temperature,
  });
  return {
    output: parseModelJson(result),
    usage: result.usage ?? {},
    provider: 'cloudflare',
    model: WORKERS_AI_MODEL,
  };
}

function weakestPillar(activePillars, scores) {
  return activePillars.reduce((weakest, pillar) =>
    (scores[pillar] ?? 50) < (scores[weakest] ?? 50) ? pillar : weakest,
  activePillars[0]);
}

async function handleDirective(request, env) {
  const user = await authenticatedUser(request, env);
  const body = await request.json();
  if (body.userId !== user.id) throw new Error('AUTH:Cross-user access is not allowed');
  if (!Array.isArray(body.activePillars) || !body.activePillars.length) return json({ error: 'Invalid request' }, 400);
  await requireAiConsent(env, user.id);
  await requireBudget(env, user.id);
  const pillar = weakestPillar(body.activePillars, body.pillarScores ?? {});
  const prompt = `Generate exactly one safe, measurable daily directive as JSON.\nPhase: ${body.phase}\nTarget pillar: ${pillar}\nPillar scores: ${JSON.stringify(body.pillarScores ?? {})}\nRecent moods: ${JSON.stringify((body.recentMoods ?? []).slice(0, 14))}\nRecent energy: ${JSON.stringify((body.recentEnergy ?? []).slice(0, 14))}\nRecent metrics: ${JSON.stringify(body.recentMetrics ?? {})}`;
  const generation = await generateStructured(env, prompt, {
    type: 'object',
    properties: {
      title: { type: 'string' },
      body: { type: 'string' },
      why: { type: 'string' },
      action: { type: 'string' },
    },
    required: ['title', 'body', 'why', 'action'],
    additionalProperties: false,
  }, 500, 0.6);
  const output = generation.output;
  if (!output.title || !output.body || !output.why || !output.action) throw new Error('Invalid AI response');
  await recordUsage(env, user.id, 'directive', generation.provider, generation.model, generation.usage);
  return json({ ...output, pillar, model: generation.model });
}

async function handleAudit(request, env) {
  const user = await authenticatedUser(request, env);
  const body = await request.json();
  if (body.userId !== user.id) throw new Error('AUTH:Cross-user access is not allowed');
  await requireAiConsent(env, user.id);
  await requireBudget(env, user.id);
  const prompt = `Write a concise weekly coaching audit as JSON using only these facts.\nPhase: ${body.phase}\nDirective completion: ${body.directiveCompletion}%\nPillar scores: ${JSON.stringify(body.pillarScores ?? {})}\nWeekly metrics: ${JSON.stringify(body.weeklyMetrics ?? {})}`;
  const generation = await generateStructured(env, prompt, {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      highlights: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      gaps: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    },
    required: ['summary', 'highlights', 'gaps'],
    additionalProperties: false,
  }, 700, 0.5);
  const output = generation.output;
  if (!output.summary || !Array.isArray(output.highlights) || !Array.isArray(output.gaps)) throw new Error('Invalid AI response');
  await recordUsage(env, user.id, 'audit', generation.provider, generation.model, generation.usage);
  return json(output);
}

async function generateChatReply(env, contextPrompt, history) {
  const messages = [
    { role: 'user', content: contextPrompt },
    { role: 'assistant', content: 'Understood. I will use this profile context where relevant to the conversation.' },
    ...history.map((entry) => ({ role: entry.role, content: entry.content })),
  ];
  if (env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 800,
          temperature: 0.7,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`HTTP ${response.status}: ${details.slice(0, 500)}`);
      }
      const result = await response.json();
      const text = result.content?.find((block) => block.type === 'text')?.text;
      if (!text) throw new Error('No text output');
      return { text, usage: result.usage ?? {}, provider: 'anthropic', model: ANTHROPIC_MODEL };
    } catch (error) {
      // Keep the chat available during provider outages, invalid credentials, or quota issues.
      console.error(`Anthropic chat failed; using Workers AI fallback: ${String(error)}`);
    }
  }

  if (!env.AI) throw new Error('No AI provider is configured');
  const result = await env.AI.run(WORKERS_AI_MODEL, {
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    max_tokens: 800,
    temperature: 0.7,
  });
  const text = typeof result?.response === 'string' ? result.response : String(result?.response ?? '');
  if (!text) throw new Error('No text output');
  return { text, usage: result.usage ?? {}, provider: 'cloudflare', model: WORKERS_AI_MODEL };
}

async function handleChat(request, env) {
  const user = await authenticatedUser(request, env);
  const body = await request.json();
  if (typeof body.conversationId !== 'string' || !body.conversationId) return json({ error: 'Invalid request' }, 400);
  await requireAiConsent(env, user.id);
  await requireBudget(env, user.id);

  const conversationResponse = await supabaseRequest(
    env,
    `/rest/v1/ai_conversations?id=eq.${encodeURIComponent(body.conversationId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id`,
  );
  if (!conversationResponse.ok || !(await conversationResponse.json())[0]) throw new Error('AUTH:Conversation not found');

  const messagesResponse = await supabaseRequest(
    env,
    `/rest/v1/ai_messages?conversation_id=eq.${encodeURIComponent(body.conversationId)}&select=role,content&order=created_at.asc&limit=40`,
  );
  if (!messagesResponse.ok) throw new Error('Unable to load conversation');
  const history = await messagesResponse.json();
  if (!history.length || history[history.length - 1].role !== 'user') throw new Error('Invalid request');

  const contextPrompt = `User profile context — use only where relevant, never repeat it verbatim:\nPhase: ${body.phase ?? 'unknown'}\nActive pillars: ${JSON.stringify(body.activePillars ?? [])}\nPillar scores: ${JSON.stringify(body.pillarScores ?? {})}`;
  const generation = await generateChatReply(env, contextPrompt, history);

  const insertReply = await supabaseRequest(env, '/rest/v1/ai_messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ conversation_id: body.conversationId, role: 'assistant', content: generation.text }),
  });
  if (!insertReply.ok) throw new Error('Unable to store AI reply');
  const [reply] = await insertReply.json();

  await supabaseRequest(env, `/rest/v1/ai_conversations?id=eq.${encodeURIComponent(body.conversationId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updated_at: new Date().toISOString() }),
  });

  await recordUsage(env, user.id, 'chat', generation.provider, generation.model, generation.usage);
  return json({ id: reply.id, conversationId: reply.conversation_id, role: 'assistant', content: reply.content, createdAt: reply.created_at });
}

async function handleDeleteAccount(request, env) {
  const user = await authenticatedUser(request, env);
  for (const bucket of ['avatars', 'social-media']) {
    const listResponse = await supabaseRequest(env, `/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: user.id, limit: 1000, offset: 0 }),
    });
    if (!listResponse.ok) throw new Error('Media cleanup failed');
    const objects = await listResponse.json();
    for (const object of objects) {
      const objectPath = `${user.id}/${object.name}`.split('/').map(encodeURIComponent).join('/');
      const deleteResponse = await supabaseRequest(env, `/storage/v1/object/${bucket}/${objectPath}`, { method: 'DELETE' });
      if (!deleteResponse.ok) throw new Error('Media cleanup failed');
    }
  }
  const response = await supabaseRequest(env, `/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Account deletion failed');
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const path = new URL(request.url).pathname;
  try {
    if (path === '/api/health' && request.method === 'GET') return json({ status: 'ok', runtime: 'cloudflare-pages' });
    if (path === '/api/account' && request.method === 'DELETE') return await handleDeleteAccount(request, env);
    if (path === '/api/directive' && request.method === 'POST') return await handleDirective(request, env);
    if (path === '/api/audit/summary' && request.method === 'POST') return await handleAudit(request, env);
    if (path === '/api/chat' && request.method === 'POST') return await handleChat(request, env);
    const integrationMatch = path.match(/^\/api\/integrations\/([a-z0-9-]+)(?:\/(connect|callback|sync))?$/);
    if (integrationMatch) {
      const [, providerId, action] = integrationMatch;
      if (action === 'connect' && request.method === 'POST') return await handleIntegrationConnect(request, env, providerId);
      if (action === 'callback' && request.method === 'GET') return await handleIntegrationCallback(request, env, providerId);
      if (action === 'sync' && request.method === 'POST') return await handleIntegrationSync(request, env, providerId);
      if (!action && request.method === 'DELETE') return await handleIntegrationDisconnect(request, env, providerId);
    }
    return json({ error: 'Not found' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (message.startsWith('AUTH:')) return json({ error: message.slice(5) }, 401);
    if (message.startsWith('BUDGET:')) return json({ error: message.slice(7) }, 429);
    if (message.startsWith('SETUP:')) return json({ error: message.slice(6), setupRequired: true }, 503);
    console.error(message);
    return json({ error: 'Request failed' }, 500);
  }
}
