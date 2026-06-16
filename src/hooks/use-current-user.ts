import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setIsAdmin(!!data?.some((r) => r.role === "admin"));
      });
  }, [user]);

  const fetchProfileName = useCallback(() => {
    if (!user) {
      setProfileName(null);
      return;
    }
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setProfileName(data.full_name || "");
        } else {
          setProfileName("");
        }
      });
  }, [user]);

  useEffect(() => {
    fetchProfileName();
  }, [user, fetchProfileName]);

  useEffect(() => {
    if (!user) return;

    window.addEventListener("profile-updated", fetchProfileName);
    return () => {
      window.removeEventListener("profile-updated", fetchProfileName);
    };
  }, [user, fetchProfileName]);

  return { user, loading, isAdmin, profileName, fetchProfileName };
}
