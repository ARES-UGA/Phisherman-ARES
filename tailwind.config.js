/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}", "./src/**/*.html", "./src/**/*.ts"],
  theme: {
    extend: {
      colors: {
        "main-white": "#FFF",
        "main-secondary": "#EA4335",
        "main-primary": "#362BFD",
        "main-dark": "#161616",
        "main-paragraph": "#8B8B8B",
        "shades-dark-10": "#E8E8E8",
        "shades-dark-40": "#A2A2A2",
        "shades-dark-5": "#F3F3F3",
        "shades-primary-10": "#EBEAFF",
        "email-bg": "#F3F4F8",
        "safe-green": "#53CC5B",
      },
      fontFamily: {
        poppins: [
          "Poppins",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        satoshi: [
          "Satoshi",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      fontSize: {
        28: "28px",
      },
      letterSpacing: {
        "tight-1": "-1px",
      },
      borderRadius: {
        16: "16px",
        40: "40px",
      },
      spacing: {
        18: "72px",
        50: "200px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
