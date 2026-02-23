import logoImg from "@/assets/piccoload-logo.png";
import qrCodeImg from "@/assets/qr-code.jpg";

const BackCoverPage = () => {
  return (
    <div
      className="relative w-full h-full flex flex-col"
      style={{ backgroundColor: "#fffaf3" }}
    >
      {/* Top 75% — empty */}
      <div className="flex-[3]" />

      {/* Bottom 25% — all content */}
      <div className="flex-1 flex flex-col items-center justify-start" style={{ paddingBottom: 100 }}>
        {/* Logo */}
        <img src={logoImg} alt="Piccoload" style={{ width: "40%" }} />

        {/* Website + Social */}
        <div
          className="flex items-center justify-center"
          style={{
            gap: 20,
            paddingTop: 30,
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
            <div>programme. Make money for</div>
            <div>your referrals!</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackCoverPage;
