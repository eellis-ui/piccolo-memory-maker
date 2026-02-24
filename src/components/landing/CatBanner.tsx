const CatBanner = () => {
  return (
    <section className="relative w-full">
      <div className="relative w-full h-[50vh] md:h-[70vh] overflow-hidden">
        <img
          src="/images/banner-cat.png"
          alt="Woman photographing her cat with a phone, with line art coloring page result"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    </section>
  );
};

export default CatBanner;
