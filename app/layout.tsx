import React from "react";
import "./globals.css";
import '@ant-design/v5-patch-for-react-19';
import {Providers} from "./providers";

interface RootLayoutProps {
    children: React.ReactNode
}

export default function RootLayout({children}: RootLayoutProps) {
    return (
        <html lang="en">
        <body>
        <Providers>
            {children}
        </Providers>
        </body>
        </html>
    )
}