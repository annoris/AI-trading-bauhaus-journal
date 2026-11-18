export function InvitationCourier() {
  return (
    <div className="invite-courier-visual" aria-hidden="true">
      <span className="invite-courier-orbit invite-courier-orbit-one" />
      <span className="invite-courier-orbit invite-courier-orbit-two" />
      <span className="invite-courier-spark invite-courier-spark-one">✦</span>
      <span className="invite-courier-spark invite-courier-spark-two">✧</span>
      <svg viewBox="0 0 330 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient
            id="courier-jacket"
            x1="94"
            y1="143"
            x2="226"
            y2="245"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#53E391" />
            <stop offset=".55" stopColor="#20B96C" />
            <stop offset="1" stopColor="#117148" />
          </linearGradient>
          <linearGradient
            id="courier-face"
            x1="109"
            y1="47"
            x2="191"
            y2="140"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFE7C6" />
            <stop offset=".68" stopColor="#EFC18D" />
            <stop offset="1" stopColor="#D79B68" />
          </linearGradient>
          <linearGradient
            id="courier-hair"
            x1="108"
            y1="40"
            x2="195"
            y2="94"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#31473B" />
            <stop offset="1" stopColor="#14231C" />
          </linearGradient>
          <linearGradient
            id="courier-envelope"
            x1="197"
            y1="142"
            x2="278"
            y2="202"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFFDF2" />
            <stop offset="1" stopColor="#E7DCC2" />
          </linearGradient>
          <linearGradient
            id="courier-envelope-flap"
            x1="202"
            y1="148"
            x2="252"
            y2="188"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#F1E8D4" />
            <stop offset="1" stopColor="#D6C8A8" />
          </linearGradient>
          <filter
            id="courier-shadow"
            x="24"
            y="18"
            width="288"
            height="278"
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000" floodOpacity=".3" />
          </filter>
        </defs>
        <ellipse cx="164" cy="267" rx="93" ry="15" fill="#35D074" fillOpacity=".12" />
        <g className="invite-courier-float" filter="url(#courier-shadow)">
          <path d="M108 206 96 245c-2 8 3 15 11 16h9c6 0 10-4 12-10l14-37-34-8Z" fill="#284436" />
          <path d="m162 213 7 35c1 7 7 12 14 12h10c8 0 13-7 11-15l-8-39-34 7Z" fill="#203B2D" />
          <path d="M86 252c0-5 4-9 9-9h24c7 0 12 5 12 12v5H94c-5 0-8-3-8-8Z" fill="#F0E8D7" />
          <path d="M164 252c0-5 4-9 9-9h23c7 0 12 5 12 12v5h-36c-5 0-8-3-8-8Z" fill="#F0E8D7" />
          <path d="M194 135c8-10 21-11 31-3l15 12-20 47-31-17 5-39Z" fill="#154B31" />
          <path
            d="M107 137c7-15 24-23 42-23h24c24 0 42 17 46 41l9 50c2 11-5 21-16 23l-67 13c-14 3-27-6-30-20l-13-63c-2-8 0-15 5-21Z"
            fill="url(#courier-jacket)"
          />
          <path d="m153 123 19 20 18-23-4-17h-31l-2 20Z" fill="#D7A276" />
          <path
            d="M113 83c0-28 18-49 43-49 27 0 45 20 45 47v17c0 27-20 47-46 47-24 0-42-19-42-45V83Z"
            fill="url(#courier-face)"
          />
          <path
            d="M112 83c-2-28 16-53 43-53 17 0 31 8 39 22l-19 3c-8 1-14 1-22-1l-6 16-26 14-9 20V83Z"
            fill="url(#courier-hair)"
          />
          <path
            d="M110 65c7-23 26-38 49-38 23 0 40 12 47 34l-12 9c-20-5-40-7-60 0l-15 9-9-14Z"
            fill="#263D31"
          />
          <path
            d="M123 57c7-14 20-22 36-22 16 0 29 8 36 22-22-7-49-7-72 0Z"
            fill="#3E5A47"
            fillOpacity=".8"
          />
          <path d="M132 95c3-3 7-3 10 0" stroke="#543E32" strokeWidth="3" strokeLinecap="round" />
          <path d="M169 95c3-3 7-3 10 0" stroke="#543E32" strokeWidth="3" strokeLinecap="round" />
          <circle cx="139" cy="102" r="2.6" fill="#302A25" />
          <circle cx="176" cy="102" r="2.6" fill="#302A25" />
          <ellipse cx="128" cy="111" rx="7" ry="4" fill="#E99479" fillOpacity=".42" />
          <ellipse cx="188" cy="111" rx="7" ry="4" fill="#E99479" fillOpacity=".42" />
          <path d="M148 116c5 6 13 6 19 0" stroke="#9A554A" strokeWidth="3" strokeLinecap="round" />
          <path d="m148 147 22 16 20-21-6-9-16 13-13-12-7 13Z" fill="#F7F2E7" />
          <path
            d="m108 154-25 32c-5 7-3 16 4 20 7 4 15 2 19-5l25-34-23-13Z"
            fill="url(#courier-jacket)"
          />
          <path
            d="m201 153 34 18c7 4 9 12 5 19-4 7-12 9-19 5l-36-20 16-22Z"
            fill="url(#courier-jacket)"
          />
          <path
            d="M232 181c5-6 14-6 19 0l6 7c3 4 3 10-1 13l-5 4c-4 4-11 3-14-1l-9-11c-3-4-2-9 1-12l3-3Z"
            fill="url(#courier-face)"
          />
          <g className="invite-courier-letter">
            <rect x="216" y="143" width="71" height="52" rx="8" fill="url(#courier-envelope)" />
            <path
              d="m218 150 33 27 34-27"
              stroke="#C6B58F"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="m218 191 24-20m44 20-23-20"
              stroke="#D9CCAF"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="252" cy="180" r="5.5" fill="#35D074" />
            <path d="M251 177v6m-3-3h6" stroke="#105735" strokeWidth="1.5" strokeLinecap="round" />
          </g>
          <circle cx="114" cy="177" r="4" fill="#B3FFD0" fillOpacity=".8" />
          <circle cx="207" cy="186" r="4" fill="#B3FFD0" fillOpacity=".72" />
        </g>
      </svg>
      <span className="invite-courier-caption">A PERSONAL INVITATION</span>
    </div>
  );
}
