// Root-level loading.tsx — shown by Next.js during route transitions for all
// pages that don't have their own loading.tsx (dashboard, settings, song, etc.)
// Uses the same Thunder BlackLC SONG/ROOM draw animation as the version page,
// identical to the login page "Create Together" animation but at 50% scale.

export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0E0A0A',
      }}
    >
      <div style={{ width: '170px', overflow: 'visible' }}>
        <svg
          viewBox="0 0 342.8 334"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
          aria-hidden="true"
        >
          {/* SONG */}
          <g transform="translate(0,0)">
            <path
              d="M75.6 72V59C75.6 35.4 61.8 22 37.8 22C14.2 22 1.2 34.8 1.2 59V60.8C1.2 84.2 5 94.2 19 102L25.4 105.6C39.2 113.4 39.6 114.2 39.6 120V131.8C39.6 133.8 39.2 134.8 38.4 134.8C37.6 134.8 37.2 133.8 37.2 131.6V116H1.2V128.8C1.2 153 14 166 37.8 166C61.8 166 75.6 152.6 75.6 128.8V126.2C75.6 102.8 72 93.6 58.4 86L53 83C37.6 74.4 37.2 73.4 37.2 67.6V56.4C37.2 54.2 37.6 53.2 38.4 53.2C39.2 53.2 39.6 54.2 39.6 56.4V72Z"
              fill="none" stroke="#F4F0E8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="564" strokeDashoffset="564" strokeOpacity="0"
            >
              <animate attributeName="stroke-dashoffset" from="564" to="0" dur="3.8s" begin="0.05s" calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
              <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin="0.05s" fill="freeze"/>
            </path>
          </g>
          <g transform="translate(80.8,0)">
            <path
              d="M1.2 59V128.8C1.2 153 14.2 166 37.8 166C61.8 166 75.6 152.6 75.6 128.8V59C75.6 35.4 61.8 22 37.8 22C14.2 22 1.2 34.8 1.2 59ZM37.2 56.4C37.2 54 37.6 53.2 38.4 53.2C39.2 53.2 39.6 54 39.6 56.4V131.6C39.6 133.8 39.2 134.8 38.4 134.8C37.6 134.8 37.2 133.8 37.2 131.6Z"
              fill="none" stroke="#F4F0E8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="544" strokeDashoffset="544" strokeOpacity="0"
            >
              <animate attributeName="stroke-dashoffset" from="544" to="0" dur="3.8s" begin="0.12s" calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
              <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin="0.12s" fill="freeze"/>
            </path>
          </g>
          <g transform="translate(161.6,0)">
            <path
              d="M42.8 24 51.8 100.8H49.8L39.8 24H1.2V164H37.2L29 88H31L40.2 164H78.8V24Z"
              fill="none" stroke="#F4F0E8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="741" strokeDashoffset="741" strokeOpacity="0"
            >
              <animate attributeName="stroke-dashoffset" from="741" to="0" dur="3.8s" begin="0.2s" calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
              <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin="0.2s" fill="freeze"/>
            </path>
          </g>
          <g transform="translate(245.6,0)">
            <path
              d="M37.2 56.4C37.2 54 37.6 53.2 38.4 53.2C39.2 53.2 39.6 54 39.6 56.4V81.6H75.6V59C75.6 35.4 61.8 22 37.8 22C14.2 22 1.2 34.8 1.2 59V128.8C1.2 155.4 16 166 29.2 166C38.2 166 46.6 161.2 48.8 152.8H51.2V164H75.6V85.6H37.2ZM37.2 108.8H39.6V131.6C39.6 133.8 39.2 134.8 38.4 134.8C37.6 134.8 37.2 133.8 37.2 131.6Z"
              fill="none" stroke="#F4F0E8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="598" strokeDashoffset="598" strokeOpacity="0"
            >
              <animate attributeName="stroke-dashoffset" from="598" to="0" dur="3.8s" begin="0.28s" calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
              <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin="0.28s" fill="freeze"/>
            </path>
          </g>
          {/* ROOM */}
          <g transform="translate(0,144)">
            <path
              d="M1.2 24V164H37.2V114H37.6C39.6 114 39.6 114.4 39.6 117.2V135.2C39.6 146 39.8 155.2 41.6 164H77.6C75.8 155.4 75.6 146.2 75.6 135.6V134C75.6 112.6 63.6 99.6 55.2 99.6V97.2C63.8 97.2 75.6 85.8 75.6 62.4V61.4C75.6 36 61.8 24 38 24ZM37.2 55.2H37.6C39.6 55.2 39.6 55.6 39.6 58.2V79.6C39.6 82.4 39.6 82.8 37.6 82.8H37.2Z"
              fill="none" stroke="#F4F0E8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="591" strokeDashoffset="591" strokeOpacity="0"
            >
              <animate attributeName="stroke-dashoffset" from="591" to="0" dur="3.8s" begin="0.07s" calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
              <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin="0.07s" fill="freeze"/>
            </path>
          </g>
          <g transform="translate(80.8,144)">
            <path
              d="M1.2 59V128.8C1.2 153 14.2 166 37.8 166C61.8 166 75.6 152.6 75.6 128.8V59C75.6 35.4 61.8 22 37.8 22C14.2 22 1.2 34.8 1.2 59ZM37.2 56.4C37.2 54 37.6 53.2 38.4 53.2C39.2 53.2 39.6 54 39.6 56.4V131.6C39.6 133.8 39.2 134.8 38.4 134.8C37.6 134.8 37.2 133.8 37.2 131.6Z"
              fill="none" stroke="#F4F0E8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="544" strokeDashoffset="544" strokeOpacity="0"
            >
              <animate attributeName="stroke-dashoffset" from="544" to="0" dur="3.8s" begin="0.15s" calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
              <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin="0.15s" fill="freeze"/>
            </path>
          </g>
          <g transform="translate(161.6,144)">
            <path
              d="M1.2 59V128.8C1.2 153 14.2 166 37.8 166C61.8 166 75.6 152.6 75.6 128.8V59C75.6 35.4 61.8 22 37.8 22C14.2 22 1.2 34.8 1.2 59ZM37.2 56.4C37.2 54 37.6 53.2 38.4 53.2C39.2 53.2 39.6 54 39.6 56.4V131.6C39.6 133.8 39.2 134.8 38.4 134.8C37.6 134.8 37.2 133.8 37.2 131.6Z"
              fill="none" stroke="#F4F0E8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="544" strokeDashoffset="544" strokeOpacity="0"
            >
              <animate attributeName="stroke-dashoffset" from="544" to="0" dur="3.8s" begin="0.22s" calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
              <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin="0.22s" fill="freeze"/>
            </path>
          </g>
          <g transform="translate(242.4,144)">
            <path
              d="M1.2 24V164H34.2L30 88H32.4L37.2 164H59.2L64 88H66.4L62.2 164H95.2V24H49.6V100.8H47.2V24Z"
              fill="none" stroke="#F4F0E8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="925" strokeDashoffset="925" strokeOpacity="0"
            >
              <animate attributeName="stroke-dashoffset" from="925" to="0" dur="3.8s" begin="0.32s" calcMode="spline" keySplines="0.25 0.1 0.25 1" fill="freeze"/>
              <animate attributeName="stroke-opacity" values="0;1" keyTimes="0;1" dur="0.05s" begin="0.32s" fill="freeze"/>
            </path>
          </g>
        </svg>
      </div>
    </div>
  );
}
