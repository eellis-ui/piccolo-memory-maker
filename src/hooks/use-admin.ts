import { useAuth } from "@/contexts/AuthContext";

export const useIsAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Need to import useState from react
  const [, forceUpdate] = useState(0);

  // Check admin role whenever user changes
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { supabase } = require("@/integrations/supabase/client");
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        setIsAdmin(!!data);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isAdmin, loading };
};
