// Shift data source. No data yet — replace with a real Supabase query
// (schicht_instanzen / schicht_zuweisungen) when the schedule feature lands.
export type Shift = {
  id: string;
  title: string;
  date: string;   // YYYY-MM-DD
  start: string;  // HH:MM
  end: string;    // HH:MM
  role: string;
  coworkers: string[];
  comment: string;
};

export const showCoworkers = true;

export const shifts: Shift[] = [];
