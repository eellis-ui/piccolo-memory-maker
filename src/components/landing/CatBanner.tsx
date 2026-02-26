import ReviewsBanner from "./ReviewsBanner";

const CatBanner = () => {
  return (
    <section className="relative w-full">
      <ReviewsBanner />
      <div className="relative w-full h-[40vh] md:h-[55vh] overflow-hidden">
        <img
          src="/images/banner-cat.png"
          alt="Woman photographing a cat, with the photo converted to a coloring page line art"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    </section>
  );
};

export default CatBanner;
