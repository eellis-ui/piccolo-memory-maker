import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (error) {
          console.error("Admin role check failed:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
        setLoading(false);
      })
      .catch(() => { setIsAdmin(false); setLoading(false); });
  }, [user, authLoading]);

  return { isAdmin, loading };
};
