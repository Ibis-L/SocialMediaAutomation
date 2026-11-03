"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, api } from "@/providers/AuthProvider";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Sources",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
  },
  {
    href: "/news-management",
    label: "News",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  {
    href: "/editorial-approval",
    label: "Editorial",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/compose",
    label: "WhatsApp",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: "/twitter",
    label: "Twitter (X)",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/youtube",
    label: "YouTube",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    href: "/instagram",
    label: "Instagram",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    href: "/facebook",
    label: "Facebook",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/manage-devices",
    label: "Devices",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/user-management",
    label: "Users",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    href: "/user-approvals",
    label: "Approvals",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userGroups, setUserGroups] = useState([]);

  // Fetch user groups for role-based nav visibility
  useEffect(() => {
    api.get("/api/auth/me/")
      .then((res) => {
        setUserGroups(res.data.groups || []);
      })
      .catch(() => {
        setUserGroups([]);
      });
  }, []);

  const groups = user?.groups || userGroups || [];
  const isSuperAdmin = groups.includes("Super Admin");
  const isEditor = groups.includes("Editor");
  const isWriter = groups.includes("News Writer");
  const isPublisher = groups.includes("Publisher");
  const isViewer = groups.includes("Viewer/Reporter");

  useEffect(() => {
    if (!user) return;
    
    // Protect Sources (/) - Only Super Admin
    if (pathname === '/' && !isSuperAdmin) {
      router.push('/news-management');
    }
    // Protect Editorial - Only Editor and Super Admin
    if (pathname === '/editorial-approval' && !isSuperAdmin && !isEditor) {
      router.push('/news-management');
    }
    // Protect WhatsApp, Twitter & YouTube - Only Publisher and Super Admin
    if ((pathname === '/dashboard/compose' || pathname.startsWith('/twitter') || pathname.startsWith('/instagram') || pathname.startsWith('/dashboard/instagram') || pathname.startsWith('/facebook') || pathname.startsWith('/dashboard/facebook') || pathname.startsWith('/dashboard/twitter') || pathname.startsWith('/dashboard/youtube')) && !isSuperAdmin && !isPublisher) {
      router.push('/news-management');
    }
    // Protect Devices Hub
    const isDevicesRoute = pathname.startsWith('/dashboard/manage-devices') || pathname.startsWith('/dashboard/queue') || pathname.startsWith('/dashboard/monitoring') || pathname.startsWith('/dashboard/app-releases');
    if (isDevicesRoute && !isSuperAdmin && !isPublisher) {
      router.push('/news-management');
    }
    // Protect User Management & Approvals - Only Super Admin
    if ((pathname === '/user-approvals' || pathname === '/user-management') && !isSuperAdmin) {
      router.push('/news-management');
    }
  }, [pathname, user, isSuperAdmin, isEditor, isPublisher, router]);

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (isSuperAdmin) return true;
    
    if (item.href === "/") {
      return false; // Only Super Admin
    }
    if (item.href === "/editorial-approval") {
      return isEditor; // Editor can approve/reject
    }
    if (item.href === "/dashboard/compose" || item.href === "/twitter" || item.href === "/instagram" || item.href === "/facebook" || item.href === "/dashboard/youtube") {
      return isPublisher; // Publisher handles WhatsApp, Twitter & YouTube
    }
    if (item.href === "/dashboard/manage-devices") {
      return isPublisher; // Publisher handles device farm
    }
    if (item.href === "/user-approvals" || item.href === "/user-management") {
      return false; // Only Super Admin
    }
    // /news-management is visible to everyone
    return true;
  });

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop sidebar spacer (reserves space in the flex layout) ── */}
      <div className="hidden lg:block w-[237px] shrink-0" />

      {/* ── Desktop sidebar (lg and up) — fixed to viewport ── */}
      <aside className="hidden lg:flex fixed top-0 left-0 w-[237px] h-screen bg-brand-sidebar flex-col items-center py-6 z-40">
        {/* Brand / Logo */}
        <div className="flex flex-col items-center gap-1 mb-10">
          <div className="w-9 h-9 bg-brand-red flex items-center justify-center">
            <span className="text-white font-label text-sm font-bold tracking-wider">
              SS
            </span>
          </div>
          <span className="text-white/50 font-label text-[9px] tracking-[0.25em] mt-1 uppercase">
            Local
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 w-full flex flex-col gap-1 px-3">
          <div className="w-full h-px bg-white/10 mb-3" />
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/dashboard/manage-devices"
                ? pathname.startsWith("/dashboard/manage-devices") || pathname.startsWith("/dashboard/queue") || pathname.startsWith("/dashboard/monitoring") || pathname.startsWith("/dashboard/app-releases")
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.label.toLowerCase()}`}
                className={`
                  flex flex-col items-center gap-1.5 px-2 py-3 rounded transition-colors duration-150 group
                  ${isActive ? "bg-brand-red/20 text-brand-red" : "text-white/40 hover:text-white/70 hover:bg-white/5"}
                `}
              >
                <span className={`transition-colors ${isActive ? "text-brand-red" : "text-white/40 group-hover:text-white/70"}`}>
                  {item.icon}
                </span>
                <span className={`font-label text-[9px] tracking-[0.18em] uppercase transition-colors ${isActive ? "text-brand-red" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <div className="w-full h-px bg-white/10 mt-3" />
        </nav>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="mb-4 flex flex-col items-center gap-1.5 px-2 py-2 rounded transition-colors duration-150 text-white/40 hover:text-brand-red hover:bg-white/5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-label text-[9px] tracking-[0.18em] uppercase">
            Logout
          </span>
        </button>
      </aside>

      {/* ── Mobile hamburger toggle button (below lg) ── */}
      <button
        id="mobile-menu-toggle"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center bg-brand-sidebar rounded-lg shadow-lg active:scale-95 transition-transform"
        aria-label="Open navigation menu"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── Mobile slide-out drawer (below lg) ── */}
      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-[70] h-full w-52 bg-brand-sidebar flex flex-col items-center py-6 transition-transform duration-300 ease-in-out shadow-2xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          id="mobile-menu-close"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors rounded"
          aria-label="Close navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Brand / Logo */}
        <div className="flex flex-col items-center gap-1 mb-8">
          <div className="w-9 h-9 bg-brand-red flex items-center justify-center">
            <span className="text-white font-label text-sm font-bold tracking-wider">
              SS
            </span>
          </div>
          <span className="text-white/50 font-label text-[9px] tracking-[0.25em] mt-1 uppercase">
            Local
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 w-full flex flex-col gap-1 px-3">
          <div className="w-full h-px bg-white/10 mb-3" />
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/dashboard/manage-devices"
                ? pathname.startsWith("/dashboard/manage-devices") || pathname.startsWith("/dashboard/queue") || pathname.startsWith("/dashboard/monitoring") || pathname.startsWith("/dashboard/app-releases")
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`mobile-nav-${item.label.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded transition-colors duration-150 group
                  ${isActive ? "bg-brand-red/20 text-brand-red" : "text-white/40 hover:text-white/70 hover:bg-white/5"}
                `}
              >
                <span className={`transition-colors shrink-0 ${isActive ? "text-brand-red" : "text-white/40 group-hover:text-white/70"}`}>
                  {item.icon}
                </span>
                <span className={`font-label text-[10px] tracking-[0.15em] uppercase transition-colors ${isActive ? "text-brand-red font-semibold" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <div className="w-full h-px bg-white/10 mt-3" />
        </nav>
      </aside>
    </>
  );
}
