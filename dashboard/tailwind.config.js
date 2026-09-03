/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        main: '#31363b', 
        panel: '#1a1a1a',
        title: '#262626',
        border: '#404040',
      },
      borderRadius: {
        'sm': '2px',
      }
    },
  },
  plugins: [],
}
