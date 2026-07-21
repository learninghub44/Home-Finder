/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EAF3EE",
          100: "#CFE4D6",
          200: "#9FC9AC",
          300: "#6FAE82",
          400: "#469463",
          500: "#2C7A4B",
          600: "#22613C",
          700: "#1A4A2E",
          800: "#123321",
          900: "#0B1F17",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#101512",
        },
        muted: {
          light: "#F4F6F5",
          dark: "#1B221E",
        },
        danger: "#D9463C",
        warning: "#E0A526",
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
      },
      borderRadius: {
        xl: "18px",
        "2xl": "24px",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
