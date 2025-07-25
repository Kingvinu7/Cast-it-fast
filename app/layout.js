import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WagmiWrapper } from "@/components/WagmiWrapper";

export const metadata = {
  title: "Cast-it-Fast",
  description: "Fast-paced trivia game on Farcaster, made by vinu07",
  openGraph: {
    title: "Cast-it-Fast",
    description: "Fast-paced trivia. 3 rounds. 15 questions. Can you beat the game?",
    images: ["https://cast-it-fast.vercel.app/og.png"],
    button: "Start game"
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://cast-it-fast.vercel.app/og.png",
    "fc:frame:button:1": "Start Game",
    "fc:frame:button:1:action": "post",
    "fc:frame:post_url": "https://cast-it-fast.vercel.app/api/frame/start",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WagmiWrapper>
          {children}
        </WagmiWrapper>
      </body>
    </html>
  );
}
