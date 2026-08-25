import { useState, useEffect } from "react";
import { Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const INSTAGRAM_URL = "https://www.instagram.com/officialpiccoload/";

/** Fallback images used when no admin-uploaded photos exist yet */
const FALLBACK_POSTS = [
  { src: "/images/instagram/instagram-1.webp", alt: "Piccoload coloring book" },
  { src: "/images/instagram/instagram-2.jpg", alt: "Piccoload coloring book" },
  { src: "/images/instagram/instagram-3.webp", alt: "Piccoload coloring book" },
  { src: "/images/instagram/instagram-4.jpg", alt: "Piccoload coloring book" },
  { src: "/images/instagram/instagram-5.jpg", alt: "Piccoload coloring book" },
  { src: "/images/instagram/instagram-6.jpg", alt: "Piccoload coloring book" },
];

const InstagramSection = () => {
  const [posts, setPosts] = useState(FALLBACK_POSTS);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_images")
        .select("image_path, alt_text")
        .eq("section", "instagram")
        .order("sort_order")
        .limit(6);

      if (data && data.length > 0) {
        setPosts(
          data.map((row) => {
            const { data: urlData } = supabase.storage
              .from("order-files")
              .getPublicUrl(row.image_path);
            return { src: urlData.publicUrl, alt: row.alt_text || "Piccoload coloring book" };
          })
        );
      }
    };
    load();
  }, []);

  return (
    <section className="py-16 bg-background">
      <div className="text-center mb-10 px-4">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground uppercase mb-4">
          Follow Us On Instagram
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          We love to see you using your Piccoload book! Please tag us on Instagram{" "}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-foreground font-medium hover:text-primary transition-colors"
          >
            @officialpiccoload
          </a>{" "}
          for a chance to be featured!
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {posts.map((post, i) => (
            <a
              key={i}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-muted"
            >
              <img
                src={post.src}
                alt={post.alt}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                <Instagram className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="text-center mt-8">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full font-medium text-sm hover:bg-foreground/90 transition-colors"
        >
          <Instagram className="w-5 h-5" />
          @officialpiccoload
        </a>
      </div>
    </section>
  );
};

export default InstagramSection;
