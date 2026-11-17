import { supabase } from "./supabase.js";

/* ─── Auth ──────────────────────────────────────────────────────────── */

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

/* ─── Profile ───────────────────────────────────────────────────────── */

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error && error.code !== "PGRST116") return { error };
  return { data, error: null };
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();
  return { data, error };
}

/* ─── Season Setup ──────────────────────────────────────────────────── */

export async function fetchSeasonSetup(userId) {
  const { data, error } = await supabase.from("season_setups").select("*").eq("user_id", userId).maybeSingle();
  if (error) return { error };
  return { data, error: null };
}

export async function upsertSeasonSetup(userId, setup) {
  const existing = await fetchSeasonSetup(userId);
  if (existing.error) return { error: existing.error };

  if (existing.data) {
    const { data, error } = await supabase
      .from("season_setups")
      .update({ ...setup, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from("season_setups")
      .insert({ user_id: userId, ...setup })
      .select()
      .single();
    return { data, error };
  }
}

/* ─── Checklist ─────────────────────────────────────────────────────── */

export async function fetchChecklist(userId) {
  const { data, error } = await supabase.from("checklists").select("*").eq("user_id", userId).maybeSingle();
  if (error) return { error };
  if (!data) return { data: { mulch: false, water: false, pest: false, input_plan: false }, error: null };
  return {
    data: { mulch: data.mulch, water: data.water, pest: data.pest, inputPlan: data.input_plan },
    error: null,
  };
}

export async function toggleChecklistItem(userId, key, value) {
  const column = key === "inputPlan" ? "input_plan" : key;
  const existing = await supabase.from("checklists").select("*").eq("user_id", userId).maybeSingle();

  if (existing.data) {
    const { data, error } = await supabase
      .from("checklists")
      .update({ [column]: value, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();
    return { data, error };
  } else {
    const defaults = { user_id: userId, mulch: false, water: false, pest: false, input_plan: false };
    const { data, error } = await supabase
      .from("checklists")
      .insert({ ...defaults, [column]: value })
      .select()
      .single();
    return { data, error };
  }
}

/* ─── Records ───────────────────────────────────────────────────────── */

export async function fetchRecords(userId) {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return { error };
  return { data: data || [], error: null };
}

export async function insertRecord(userId, record) {
  const { data, error } = await supabase
    .from("records")
    .insert({ user_id: userId, ...record })
    .select()
    .single();
  return { data, error };
}

export async function deleteRecord(recordId) {
  const { error } = await supabase.from("records").delete().eq("id", recordId);
  return { error };
}

/* ─── Actions ───────────────────────────────────────────────────────── */

export async function fetchActions(userId) {
  const { data, error } = await supabase.from("actions").select("*").eq("user_id", userId);
  if (error) return { error };
  const map = {};
  (data || []).forEach((a) => { map[a.action_index] = a.done; });
  return { data: map, error: null };
}

export async function setActionDone(userId, index, done) {
  const existing = await supabase.from("actions").select("*").eq("user_id", userId).eq("action_index", index).maybeSingle();
  if (existing.error) return { error: existing.error };

  if (existing.data) {
    const { error } = await supabase
      .from("actions")
      .update({ done, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("action_index", index);
    return { error };
  } else {
    const { error } = await supabase
      .from("actions")
      .insert({ user_id: userId, action_index: index, done });
    return { error };
  }
}

/* ─── Reminders ─────────────────────────────────────────────────────── */

export async function fetchReminders(userId) {
  const { data, error } = await supabase.from("reminders").select("*").eq("user_id", userId).maybeSingle();
  if (error) return { error };
  return { data: data ? data.enabled : true, error: null };
}

export async function setRemindersEnabled(userId, enabled) {
  const existing = await supabase.from("reminders").select("*").eq("user_id", userId).maybeSingle();
  if (existing.error) return { error: existing.error };

  if (existing.data) {
    const { error } = await supabase
      .from("reminders")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    return { error };
  } else {
    const { error } = await supabase.from("reminders").insert({ user_id: userId, enabled });
    return { error };
  }
}

/* ─── Load all data at once ─────────────────────────────────────────── */

export async function loadAllData(userId) {
  const [profileRes, setupRes, checklistRes, recordsRes, actionsRes, remindersRes] = await Promise.all([
    fetchProfile(userId),
    fetchSeasonSetup(userId),
    fetchChecklist(userId),
    fetchRecords(userId),
    fetchActions(userId),
    fetchReminders(userId),
  ]);

  return {
    profile: profileRes.data,
    seasonSetup: setupRes.data || { crop: "", size: "", unit: "Acres", waterSource: "", challenge: "" },
    checklist: checklistRes.data || { mulch: false, water: false, pest: false, inputPlan: false },
    records: recordsRes.data || [],
    actionsDone: actionsRes.data || {},
    remindersOn: remindersRes.data !== false,
    errors: {
      profile: profileRes.error,
      setup: setupRes.error,
      checklist: checklistRes.error,
      records: recordsRes.error,
      actions: actionsRes.error,
      reminders: remindersRes.error,
    },
  };
}
