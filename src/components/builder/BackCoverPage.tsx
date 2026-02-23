import logoImg from "@/assets/piccoload-logo.png";
import qrCodeImg from "@/assets/qr-code.jpg";

/**
 * Back cover of the book.
 * Background matches front cover (#fffaf3).
 * Logo sits just above the bottom-quarter line.
 * Bottom quarter contains website/social, QR + affiliate text.
 */
const BackCoverPage = () => {
  return (
    <div
      className="relative w-full h-full flex flex-col items-center"
      style={{ backgroundColor: "#fffaf3" }}
    >
      {/* ── Upper 75 %: logo sitting just above the 75 % line ── */}
      <div className="flex-[3] flex items-end justify-center w-full pb-0">
        <img
          src={logoImg}
          alt="Piccoload"
          style={{ width: "40%" }}
        />
      </div>

      {/* ── Bottom 25 % ── */}
      <div
        className="flex-1 flex flex-col items-center w-full"
        style={{ paddingBottom: 100 }}
      >
        {/* Website + Social handle */}
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

        {/* QR code + Affiliate text */}
        <div
          className="flex items-center justify-center"
          style={{ paddingTop: 30 }}
        >
          {/* QR Code */}
          <div
            className="flex-shrink-0"
            style={{ width: 60, height: 60 }}
          >
            <img
              src={qrCodeImg}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          </div>

          {/* 4-line text */}
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
