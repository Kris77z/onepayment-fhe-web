"use client"

import * as React from "react"
import {
  IconChartPie,
  IconExchange,
  IconHistory,
  IconSettings,
  IconWallet,
} from "@tabler/icons-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useEffect, useState } from "react"
import { getJson } from "@/lib/api"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type PageType = 'overview' | 'payment' | 'trade' | 'history' | 'settings';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onPageChange?: (page: PageType) => void;
  currentPage?: PageType;
}

export function AppSidebar({ onPageChange, currentPage, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const [user, setUser] = useState({ name: "OnePay User", email: "user@onepay.com", avatar: "/avatar/4.png" })

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{ const me = await getJson<{ email:string }>(`/me`) ; if(mounted && me?.email){ setUser(u=>({ ...u, email: me.email })) } }catch{}
    })()
    return ()=>{ mounted=false }
  },[])

  const navMain = [
    {
      title: "Overview",
      url: "/dashboard/overview",
      icon: IconChartPie as any,
      key: "overview" as PageType,
      isActive: pathname?.startsWith("/dashboard/overview"),
    },
    {
      title: "Payment",
      url: "/dashboard/payment",
      icon: IconWallet as any,
      key: "payment" as PageType,
      isActive: pathname?.startsWith("/dashboard/payment"),
    },
    {
      title: "Trade",
      url: "/dashboard/trade",
      icon: IconExchange as any,
      key: "trade" as PageType,
      isActive: pathname?.startsWith("/dashboard/trade"),
    },
    {
      title: "History",
      url: "/dashboard/history",
      icon: IconHistory as any,
      key: "history" as PageType,
      isActive: pathname?.startsWith("/dashboard/history"),
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings as any,
      key: "settings" as PageType,
      isActive: pathname?.startsWith("/dashboard/settings"),
    },
  ];


  const handleNavClick = (key?: PageType) => {};

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Image src="/images/onepay-light.png" alt="OnePay" width={16} height={16} />
                <span className="text-base font-semibold">OnePay</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} onNavClick={handleNavClick} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
