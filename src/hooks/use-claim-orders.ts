import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * On sign-in / email verification, claim any unclaimed orders that
 * belong to this user (matched by email or guest session ID stored
 * in the user's metadata).
 */
export function useClaimOrders() {
  const claimedRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user || claimedRef.current) return;

        // Only run once per app session to avoid repeated calls
        claimedRef.current = true;

        const user = session.user;
        const sessionId =
          (user.user_metadata as Record<string, string>)?.guest_session_id ?? null;

        try {
          await supabase.rpc("claim_orders_for_user", {
            _user_id: user.id,
            _email: user.email ?? "",
            _session_id: sessionId,
          });
        } catch (err) {
          console.error("Failed to claim orders:", err);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);
}
