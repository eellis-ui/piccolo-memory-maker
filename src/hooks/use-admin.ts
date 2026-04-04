import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const APPROVED_ADMIN_EMAILS = [
  "matilda@herbertandellis.com",
  "tom@herbertandellis.com",
  "ewan@herbertandellis.com",
];

export const useIsAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check approved email list first
    const emailApproved = APPROVED_ADMIN_EMAILS.includes(
      user.email?.toLowerCase() ?? ""
    );

    if (emailApproved) {
      setIsAdmin(true);
      setLoading(false);
      // Also ensure they have the role in the database for RLS policies
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
        .then(({ data }) => {
          if (!data) {
            // Insert admin role so RLS policies work for this user
            supabase.from("user_roles").upsert(
              { user_id: user.id, role: "admin" },
              { onConflict: "user_id,role" }
            ).then(({ error }) => {
              if (error) console.warn("Could not auto-assign admin role:", error.message);
            });
          }
        });
      return;
    }

    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (error) {
          console.error("Admin role check failed:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isAdmin, loading };
};
