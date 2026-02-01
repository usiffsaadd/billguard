import './globals.css'

export const metadata = {
  title: 'Billguard — Track Your Subscriptions',
  description: 'See exactly what you\'re paying for. Track, manage, and take control of all your recurring subscriptions in one place.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%231a1a1a'/><text x='6' y='23' font-family='sans-serif' font-size='20' fill='%23e11d48'>B</text></svg>"
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
