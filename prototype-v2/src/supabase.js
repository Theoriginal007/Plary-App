import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://alcczovrcxorwmngxejq.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsY2N6b3ZyY3hvcndtbmd4ZWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDU0NjUsImV4cCI6MjA3OTA4MTQ2NX0.uDkZt2P1R1nHdvbxIySmhPaT3GY0cUO7LVa8KbqJNmw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
