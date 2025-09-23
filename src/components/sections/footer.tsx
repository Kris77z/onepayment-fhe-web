"use client";

import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const { toast } = useToast();
  const goAuth = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = '/auth';
  };

  const sections = [
    {
      title: "Services",
      links: [
        { name: "Buy Crypto", href: "/auth", comingSoon: false },
        { name: "Trade", href: "/dashboard/trade", comingSoon: false },
        { name: "Payments", href: "/payments", comingSoon: false },
      ],
    },
  ];

  const legalLinks = [
    { name: "Terms and Conditions", href: "#" },
    { name: "Privacy Policy", href: "#" },
  ];

  return (
    <section className="py-32">
      <div className="container mx-auto px-4">
        <div className="flex w-full flex-col justify-between gap-10 lg:flex-row lg:items-start lg:text-left">
          <div className="flex w-full flex-col justify-between gap-6 lg:items-start">
            <div className="flex items-center lg:justify-start">
              <a href="#">
                <Image 
                  src="/images/onepay-logo-light.png" 
                  alt="logo" 
                  title="OnePay" 
                  width={150} 
                  height={50} 
                  className="h-12 w-auto object-contain" 
                  quality={90}
                />
              </a>
            </div>
            <p className="max-w-[70%] text-muted-foreground text-sm">
              Advanced Web3 payment infrastructure enabling seamless cryptocurrency transactions for modern businesses.
            </p>
            <ul className="flex items-center space-x-6 text-muted-foreground">
              {/* Social links placeholder */}
            </ul>
          </div>
          <div className="grid w-full gap-6 md:grid-cols-1 lg:gap-20">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-4 font-bold">{section.title}</h3>
                <ul className="space-y-3 text-muted-foreground text-sm">
                  {section.links.map((link) => (
                    <li key={link.name} className="font-medium hover:text-primary">
                      {link.comingSoon ? (
                        <button onClick={goAuth} className="cursor-pointer">{link.name}</button>
                      ) : (
                        <a href={link.href}>{link.name}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between gap-4 border-t py-8 font-medium text-muted-foreground text-xs md:flex-row md:items-center md:text-left">
          <p className="order-2 lg:order-1">© 2025 OnePay. All rights reserved.</p>
          <ul className="order-1 flex flex-col gap-2 md:order-2 md:flex-row">
            {legalLinks.map((link) => (
              <li key={link.name} className="text-muted-foreground">
                <span> {link.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}


