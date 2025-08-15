/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'elektro-red': '#de3f30',
        'elektro-red-dark': '#c63528',
        'elektro-yellow': '#f4b928',
        'elektro-yellow-dark': '#e6a71f',
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
        'open-sans': ['Open Sans', 'sans-serif'],
      },
      animation: {
        'pulse': 'pulse 1.5s ease-in-out infinite',
        'typing': 'typing 1.4s infinite ease-in-out',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        typing: {
          '0%, 80%, 100%': {
            transform: 'scale(0.8)',
            opacity: '0.5',
          },
          '40%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
      boxShadow: {
        'chat-bubble': '0 8px 25px rgba(222, 63, 48, 0.3)',
        'chat-bubble-hover': '0 12px 35px rgba(222, 63, 48, 0.4)',
        'chat-window': '0 20px 60px rgba(0, 0, 0, 0.15)',
        'button-hover': '0 5px 15px rgba(222, 63, 48, 0.3)',
        'card': '0 5px 20px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 30px rgba(0, 0, 0, 0.15)',
        'webchat': '0 10px 30px rgba(0, 0, 0, 0.1)',
      },
      transitionTimingFunction: {
        'chat': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
