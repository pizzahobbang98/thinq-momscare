import type { Config } from 'tailwindcss'

const config = {
  theme: {
    extend: {
      fontFamily: {
        lg: ['LGEIText', 'Malgun Gothic', 'sans-serif'],
      },
    },
  },
} satisfies Config

export default config
