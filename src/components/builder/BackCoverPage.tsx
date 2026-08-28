import qrCodeImg from "@/assets/qr-code.jpg";

// Order and proportions mirror the printed asset (covers/shared/back-cover.png):
// website line, then QR + affiliate text, then the logo at the bottom. The
// logo is the trimmed 1000x400 wordmark served from /images — the imported
// square asset carries ~75% transparent padding, which is what made earlier
// layouts overlap and would make this preview lie about the print spacing.
const BackCoverPage = () => {
  return (
    <div
      className="relative w-full h-full flex flex-col"
      style={{ backgroundColor: "#fffaf3" }}
    >
      {/* Top 75% — empty */}
      <div className="flex-[3]" />

      {/* Bottom 25% — all content */}
      <div className="flex-1 flex flex-col items-center justify-start" style={{ paddingBottom: 60 }}>
        {/* Website + Social */}
        <div
          className="flex items-center justify-center"
          style={{
            gap: 20,
            fontFamily: "'Yuji Syuku', serif",
            fontSize: 10,
            color: "#000",
          }}
        >
          <span>www.piccoload.com</span>
          <span>@officialpiccoload</span>
        </div>

        {/* QR + Affiliate text */}
        <div
          className="flex items-center justify-center"
          style={{ paddingTop: 12 }}
        >
          <img
            src={qrCodeImg}
            alt="QR Code"
            style={{ width: 50, height: 50, flexShrink: 0 }}
            className="object-contain"
          />
          <div
            style={{
              marginLeft: 20,
              fontFamily: "'Yuji Syuku', serif",
              fontSize: 8,
              color: "#000",
              lineHeight: 1.5,
            }}
          >
            <div>Please scan the QR code for</div>
            <div>information on our affiliate</div>
            <div>program. Make money for</div>
            <div>your referrals!</div>
          </div>
        </div>

        {/* Logo — last, as printed */}
        <img
          src="/images/piccoload-logo-large.png"
          alt="Piccoload"
          style={{ width: "36%", paddingTop: 18 }}
        />
      </div>
    </div>
  );
};

export default BackCoverPage;
