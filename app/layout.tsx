import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'My Google AI Studio App',
  description: 'My Google AI Studio App',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/print.css" media="print" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
