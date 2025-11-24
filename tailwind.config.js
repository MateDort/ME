/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        retro: {
          orange: '#FF6B35',
          yellow: '#F7B801',
          green: '#4ECDC4',
          blue: '#45B7D1',
          purple: '#96CEB4',
          beige: '#FFEAA7',
          brown: '#DDA15E',
        },
      },
      fontFamily: {
        retro: ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

