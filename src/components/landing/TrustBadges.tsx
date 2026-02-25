import { Lock } from "lucide-react";

const paymentMethods = [
  {
    name: "Apple Pay",
    svg: (
      <svg viewBox="0 0 50 34" className="h-8 w-auto" aria-label="Apple Pay">
        <rect width="50" height="34" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <path d="M16.2 11.5c-.6.7-1.5 1.3-2.4 1.2-.1-1 .4-2 .9-2.6.6-.7 1.5-1.2 2.3-1.3.1 1-.3 2-.8 2.7zm.8 1.3c-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.4.7 1 1.5 2.2 2.7 2.1 1-.1 1.5-.7 2.7-.7 1.2 0 1.7.7 2.7.7 1.2 0 1.9-1 2.6-2.1.8-1.2 1.1-2.3 1.2-2.4-.1 0-2.2-.9-2.2-3.4 0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.6-3.3-1.6z" fill="#000" />
        <g fill="#000">
          <path d="M25.3 10.8c2.3 0 3.8 1.6 3.8 3.8 0 2.3-1.6 3.9-3.9 3.9h-2.5v4h-1.8V10.8h4.4zm-2.6 6.3h2.1c1.6 0 2.5-.8 2.5-2.4 0-1.6-.9-2.4-2.5-2.4h-2.1v4.8z" />
          <path d="M30.1 20c0-1.5 1.1-2.4 3.2-2.5l2.3-.1v-.7c0-1-.7-1.5-1.8-1.5-.9 0-1.6.4-1.8 1.1h-1.6c.1-1.5 1.4-2.5 3.4-2.5 2 0 3.3 1.1 3.3 2.7v5.7h-1.6v-1.4h0c-.5.9-1.5 1.5-2.6 1.5-1.6 0-2.8-1-2.8-2.3zm5.5-.7v-.7l-2.1.1c-1.1.1-1.7.5-1.7 1.3 0 .7.6 1.2 1.6 1.2 1.2 0 2.2-.8 2.2-1.9z" />
          <path d="M37.8 24.1c.2.1.5.1.7.1.7 0 1.1-.3 1.4-1.1l.2-.5-3-8.4h1.9l2.1 6.7h0l2.1-6.7h1.8l-3.1 8.9c-.7 2-1.5 2.7-3.2 2.7-.2 0-.6 0-.9-.1v-1.6z" />
        </g>
      </svg>
    ),
  },
  {
    name: "Google Pay",
    svg: (
      <svg viewBox="0 0 50 34" className="h-8 w-auto" aria-label="Google Pay">
        <rect width="50" height="34" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <path d="M23.8 17.3v3.3h-1v-8.2h2.8c.7 0 1.3.2 1.8.7s.7 1.1.7 1.8-.2 1.3-.7 1.8-1.1.7-1.8.7h-1.8zm0-3.9v2.9h1.8c.4 0 .8-.2 1.1-.5.3-.3.4-.7.4-1s-.2-.7-.4-1c-.3-.3-.7-.5-1.1-.5h-1.8z" fill="#3C4043" />
        <path d="M31.1 14.3c.8 0 1.4.2 1.9.7.5.5.7 1.1.7 1.9v4h-1v-.9h0c-.4.7-1 1.1-1.8 1.1-.7 0-1.2-.2-1.7-.6-.4-.4-.6-.9-.6-1.5 0-.6.2-1.1.7-1.5.5-.4 1.1-.5 1.8-.5.7 0 1.2.1 1.6.4v-.3c0-.4-.2-.8-.5-1.1-.3-.3-.7-.4-1.1-.4-.6 0-1.1.3-1.5.8l-.9-.6c.5-.8 1.3-1.1 2.4-1.1zm-1.5 4.6c0 .3.1.6.4.8.3.2.6.3.9.3.5 0 1-.2 1.4-.6.4-.4.6-.8.6-1.3-.4-.3-.9-.5-1.5-.5-.5 0-.9.1-1.2.4-.4.2-.6.5-.6.9z" fill="#3C4043" />
        <path d="M38.6 14.5l-3.5 8h-1l1.3-2.8-2.3-5.2h1.1l1.7 4h0l1.6-4h1.1z" fill="#3C4043" />
        <path d="M20.5 16.9c0-.3 0-.6-.1-.9h-4.1v1.7h2.3c-.1.5-.4 1-.8 1.3v1.1h1.3c.8-.7 1.4-1.8 1.4-3.2z" fill="#4285F4" />
        <path d="M16.3 20.3c1.1 0 2-.4 2.7-1l-1.3-1.1c-.4.2-.8.4-1.4.4-1.1 0-2-.7-2.3-1.7h-1.4v1.1c.7 1.4 2 2.3 3.7 2.3z" fill="#34A853" />
        <path d="M13.3 16.9c-.1-.3-.1-.6-.1-.9s0-.6.1-.9v-1.1h-1.4c-.3.6-.4 1.3-.4 2s.2 1.4.4 2l1.4-1.1z" fill="#FBBC04" />
        <path d="M16.3 13.4c.6 0 1.1.2 1.6.6l1.2-1.2c-.7-.7-1.7-1.1-2.8-1.1-1.6 0-3 .9-3.7 2.3l1.4 1.1c.3-1 1.2-1.7 2.3-1.7z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    name: "PayPal",
    svg: (
      <svg viewBox="0 0 50 34" className="h-8 w-auto" aria-label="PayPal">
        <rect width="50" height="34" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <path d="M20.5 9h4.2c1.9 0 3.3.5 3.8 2.1.3.9.2 1.9-.2 2.8-.9 2.2-2.7 3.3-5.1 3.3h-1.1c-.4 0-.7.3-.8.7l-.6 3.6c0 .2-.2.3-.4.3h-2.5c-.3 0-.5-.3-.4-.6l2-11.6c.1-.4.4-.6.7-.6h.4z" fill="#003087" />
        <path d="M29.2 11c.1.5.1 1 0 1.6-.9 2.5-2.9 3.7-5.5 3.7h-1c-.4 0-.7.3-.8.7l-.7 4.3c0 .2-.2.4-.4.4h-2c-.3 0-.4-.2-.4-.5l.1-.5.6-3.6c.1-.4.4-.7.8-.7h1.1c2.4 0 4.2-1.1 5.1-3.3.4-.8.5-1.5.4-2.2.3.1.5.3.7.5z" fill="#0070E0" />
        <path d="M18.6 14.3c0-.2.1-.4.2-.5.1-.1.3-.2.5-.2h3.7c.4 0 .9 0 1.3.1.1 0 .3.1.4.1.1 0 .3.1.4.1.1 0 .1 0 .2.1.3.1.5.3.7.5-.2-1.6-1.9-2.1-3.8-2.1h-4.2c-.4 0-.7.3-.8.6l-2 11.6c0 .3.2.6.4.6h2.7l.7-4.2.6-3.6c.1-.4.4-.7.8-.7h1.1c.2 0 .4 0 .6 0l-.1-.2c-.1 0-.3-.1-.4-.1-.1 0-.3-.1-.4-.1-.4-.1-.9-.1-1.3-.1h-3.7c-.2 0-.3-.1-.5-.2-.1-.1-.2-.3-.2-.5l.3-1.6z" fill="#003087" />
      </svg>
    ),
  },
  {
    name: "Amex",
    svg: (
      <svg viewBox="0 0 50 34" className="h-8 w-auto" aria-label="American Express">
        <rect width="50" height="34" rx="4" fill="#006FCF" />
        <text x="25" y="20" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial, sans-serif">AMEX</text>
      </svg>
    ),
  },
  {
    name: "Visa",
    svg: (
      <svg viewBox="0 0 50 34" className="h-8 w-auto" aria-label="Visa">
        <rect width="50" height="34" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <path d="M22.4 22h-2.7l1.7-10.2h2.7L22.4 22z" fill="#00579F" />
        <path d="M33.3 12c-.5-.2-1.4-.4-2.4-.4-2.6 0-4.5 1.4-4.5 3.4 0 1.5 1.3 2.3 2.4 2.8 1 .5 1.4.8 1.4 1.3 0 .7-.8 1-1.6 1-1.1 0-1.6-.2-2.5-.5l-.3-.2-.4 2.2c.6.3 1.7.5 2.9.5 2.8 0 4.6-1.4 4.6-3.5 0-1.2-.7-2-2.2-2.8-1-.5-1.5-.8-1.5-1.2 0-.4.5-.8 1.6-.8.9 0 1.5.2 2 .4l.3.1.2-2.3z" fill="#00579F" />
        <path d="M37.7 11.8h-2c-.6 0-1.1.2-1.4.8l-3.9 9.4h2.8l.6-1.5h3.4l.3 1.5h2.5l-2.3-10.2zm-3.3 6.6l1.4-3.8.8 3.8h-2.2z" fill="#00579F" />
        <path d="M19.4 11.8l-2.6 7-0.3-1.4c-.5-1.6-2-3.4-3.7-4.3l2.4 9h2.8l4.2-10.3h-2.8z" fill="#00579F" />
        <path d="M14.2 11.8h-4.3l0 .2c3.3.8 5.5 2.9 6.4 5.4l-.9-4.7c-.2-.6-.6-.8-1.2-.9z" fill="#FAA61A" />
      </svg>
    ),
  },
  {
    name: "Mastercard",
    svg: (
      <svg viewBox="0 0 50 34" className="h-8 w-auto" aria-label="Mastercard">
        <rect width="50" height="34" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <circle cx="20" cy="17" r="7" fill="#EB001B" />
        <circle cx="30" cy="17" r="7" fill="#F79E1B" />
        <path d="M25 11.4c1.8 1.3 3 3.4 3 5.6s-1.2 4.3-3 5.6c-1.8-1.3-3-3.4-3-5.6s1.2-4.3 3-5.6z" fill="#FF5F00" />
      </svg>
    ),
  },
  {
    name: "Maestro",
    svg: (
      <svg viewBox="0 0 50 34" className="h-8 w-auto" aria-label="Maestro">
        <rect width="50" height="34" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <circle cx="20" cy="17" r="7" fill="#0099DF" />
        <circle cx="30" cy="17" r="7" fill="#000" />
        <path d="M25 11.4c1.8 1.3 3 3.4 3 5.6s-1.2 4.3-3 5.6c-1.8-1.3-3-3.4-3-5.6s1.2-4.3 3-5.6z" fill="#00578F" />
        <text x="25" y="28" textAnchor="middle" fill="#000" fontSize="4" fontStyle="italic" fontFamily="Arial">Maestro</text>
      </svg>
    ),
  },
  {
    name: "Shop Pay",
    svg: (
      <svg viewBox="0 0 50 34" className="h-8 w-auto" aria-label="Shop Pay">
        <rect width="50" height="34" rx="4" fill="#5A31F4" />
        <text x="25" y="15" textAnchor="middle" fill="white" fontSize="5" fontFamily="Arial, sans-serif">Shop</text>
        <text x="25" y="24" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial, sans-serif">Pay</text>
      </svg>
    ),
  },
];

const TrustBadges = () => {
  return (
    <div className="w-full">
      <p className="text-xs text-muted-foreground text-center mb-3 flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        Guaranteed safe &amp; secure checkout
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {paymentMethods.map((pm) => (
          <div key={pm.name} title={pm.name}>
            {pm.svg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustBadges;
