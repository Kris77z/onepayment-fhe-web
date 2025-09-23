"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goAuth = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = '/auth';
  };


  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 py-2 transition-all duration-300 ${isScrolled ? "bg-background/80 backdrop-blur-md border-b shadow-sm" : "bg-transparent"}`}>
        <div className="container mx-auto px-4">
          <nav className="flex h-12 md:h-16 items-center justify-between">
            <Link href="/" className="flex items-center">
              <div className="relative">
                <Image 
                  src="/images/onepay-logo-light.png" 
                  alt="OnePay" 
                  width={160} 
                  height={48} 
                  className="h-10 md:h-12 w-auto object-contain filter drop-shadow-sm" 
                  priority={true}
                  quality={90}
                  onError={(e) => {
                    console.error('Logo failed to load:', e);
                  }}
                />
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className={`group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 font-medium text-sm transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                  isScrolled
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    : "text-white/90 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                }`}
              >
                Trade
              </Link>
              <a
                href="/payments"
                className={`group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 font-medium text-sm transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                  isScrolled
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    : "text-white/90 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                }`}
              >
                Payments
              </a>
              <button
                onClick={goAuth}
                className={`transition-colors duration-300 rounded-md px-4 py-2 text-sm ${
                  isScrolled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                }`}
              >
                Get Started
              </button>
            </div>
          </nav>
        </div>
      </header>
      
    </>
  );
}


