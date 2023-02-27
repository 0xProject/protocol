const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./{app,stories}/**/*.{ts,tsx,jsx,js}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff",
      black: "#000000",
      grey: {
        25: "#FCFCFC",
        50: "#FAFAFA",
        100: "#F4F4F5",
        200: "#E4E4E7",
        300: "#D1D1D6",
        400: "#A0A0AB",
        500: "#70707B",
        600: "#51525C",
        700: "#3F3F46",
        800: "#26272B",
        900: "#18181B",
      },
      blue: "#3A65EB",
      "blue-dark": "#0E106D",
      "blue-light": "#C8D4FA",
      green: "#01A74D",
      "green-dark": "#102C22",
      "green-light": "#A2FFC1",
      brown: "#AA8544",
      "brown-dark": "#421400",
      "brown-light": "#FFE7BD",
      purple: "#37276A",
      "purple-dark": "#6B32E4",
      "purple-light": "#F7ECFF",
      red: "#CA2240",
      "red-dark": "#4C0000",
      "red-light": "#FFDFDB",
    },
    extend: {
      fontSize: {
        "1.5xl": ["1.5rem", "1.75rem"],
        "2.5xl": ["1.625rem", "2rem"],
      },
      fontFamily: {
        sans: ["PolySans", ...defaultTheme.fontFamily.sans],
      },
      dropShadow: {
        xs: "0px 1px 2px rgba(16, 24, 40, 0.05)",
        sm: [
          "0px 2px 8px rgba(16, 24, 40, 0.1)",
          "0px 1px 2px rgba(16, 24, 40, 0.06)",
        ],
        md: [
          "0px 12px 32px -2px rgba(16, 24, 40, 0.1)",
          "0px 3px 9px -2px rgba(16, 24, 40, 0.06)",
        ],
        lg: [
          "0px 12px 32px -4px rgba(16, 24, 40, 0.08)",
          "0px 4px 22px -2px rgba(16, 24, 40, 0.03)",
        ],
        xl: [
          "0px 28px 32px -4px rgba(16, 24, 40, 0.08)",
          "0px 10px 16px -4px rgba(16, 24, 40, 0.03)",
        ],
        "2xl": "0px 24px 48px -12px rgba(16, 24, 40, 0.18)",
        "3xl": "0px 32px 64px -12px rgba(16, 24, 40, 0.14)",
      },
    },
  },
  plugins: [],
};

module.exports = config;
