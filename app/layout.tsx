import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Winglex · Creator Lab",description:"Evaluate creators, plan campaigns and model claim acquisition with editable assumptions.",icons:{icon:"/winglex-mark.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
