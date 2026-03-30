import { supabase } from "./supabaseClient";

// --- Meetings CRUD ---

export async function fetchMeetings() {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createMeeting(meeting) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      user_id: user.id,
      title: meeting.title || "",
      notes: meeting.notes || "",
      transcript: meeting.transcript || "",
      summary: meeting.summary || "",
      has_summary: meeting.hasSummary || false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMeeting(id, fields) {
  // Map camelCase to snake_case
  const mapped = {};
  if ("title" in fields) mapped.title = fields.title;
  if ("notes" in fields) mapped.notes = fields.notes;
  if ("transcript" in fields) mapped.transcript = fields.transcript;
  if ("summary" in fields) mapped.summary = fields.summary;
  if ("hasSummary" in fields) mapped.has_summary = fields.hasSummary;

  mapped.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("meetings")
    .update(mapped)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMeeting(id) {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}

// --- Helper to convert DB row → app format ---
export function dbToMeeting(row) {
  return {
    id: row.id,
    title: row.title || "",
    date: new Date(row.created_at).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
      " at " +
      new Date(row.created_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    notes: row.notes || "",
    transcript: row.transcript || "",
    summary: row.summary || "",
    hasSummary: row.has_summary || false,
  };
}
