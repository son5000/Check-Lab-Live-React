import "./globals.css";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "./providers";
const inter = Inter({
    display: "swap",
    subsets: ["latin"],
    variable: "--font-inter",
});
const pretendard = localFont({
    display: "swap",
    src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
    variable: "--font-pretendard",
    weight: "45 920",
});
export const metadata = {
    title: "CheckLabLive",
    description: "Realtime lab monitoring dashboard",
};
export default function RootLayout({ children, }) {
    return (<html className={`RootLayout RootLayout__document-1 dark ${inter.variable} ${pretendard.variable}`} lang="ko" style={{ colorScheme: "dark" }}>
      <body className="RootLayout RootLayout__body-1 RootLayoutBody">
        <Providers>{children}</Providers>
      </body>
    </html>);
}
