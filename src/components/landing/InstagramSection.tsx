import { useEffect } from "react";

const INSTAGRAM_URL = "https://www.instagram.com/officialpiccoload/";
const ELFSIGHT_WIDGET_ID = "5df81938-ae16-4b59-ba46-f347e3e8f625";

const InstagramSection = () => {
  useEffect(() => {
    if (document.querySelector('script[src="https://elfsightcdn.com/platform.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://elfsightcdn.com/platform.js";
    script.async = true;
    document.body.appendChild(script);
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

      <div className="max-w-7xl mx-auto px-4">
        <div className={`elfsight-app-${ELFSIGHT_WIDGET_ID}`} data-elfsight-app-lazy />
      </div>
    </section>
  );
};

export default InstagramSection;
