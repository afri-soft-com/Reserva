/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette RESERVA — voir Branding Guide v1.0
        primaire: {
          DEFAULT: "#1A56DB",
          50: "#EBF2FF",
          100: "#D6E4FF",
          500: "#1A56DB",
          600: "#1646B0",
          700: "#0F2A5E",
        },
        accent: {
          DEFAULT: "#F5A623",
        },
        succes: {
          DEFAULT: "#10B981",
        },
        alerte: {
          DEFAULT: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        bouton: "12px",
        champ: "10px",
      },
    },
  },
  plugins: [],
};
