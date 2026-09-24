// src/features/landing/LandingNav.tsx
// Landing nav (72) per UI Kit 08-ux §12 #1 & 05-logo §4.1: logo 32, section links, ghost login,
// gold "افتح حسابك" (D20). Translucent once scrolled; slides away while scrolling down and
// returns on the first scroll up (D20).

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListIcon, MoonIcon, SunIcon, XIcon } from '@phosphor-icons/react';
import { useThemeStore } from '@/app/theme';
import { Logo } from '@/components/ui/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { useSessionStore } from '@/lib/session';
import { useT } from '@/i18n';
import { gsap, ScrollTrigger, useGSAP, T } from './motion/gsap';

// Below this the nav always shows: the top of the page is its home
const REVEAL_ZONE_PX = 72;

export const LandingNav: React.FC = () => {
  const t = useT();
  const n = t.landing.nav;
  const hasSession = useSessionStore((s) => s.hasSession);
  const { theme, toggleTheme } = useThemeStore();
  const themeLabel = theme === 'dark' ? t.shell.themeToLight : t.shell.themeToDark;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const setHiddenRef = useRef<(hidden: boolean) => void>(() => {});
  const menuOpenRef = useRef(false);

  // No scroll listeners (07-motion §1 rule 6): a sentinel at the top of the page
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The logo never appears twice in one viewport (05-logo §6): hide it while the footer shows
  const [footerVisible, setFooterVisible] = useState(false);
  useEffect(() => {
    const footer = document.getElementById('landing-footer');
    if (!footer) return;
    const io = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  // One gold button per viewport (01-color §2): the nav's gold CTA waits until the hero's leaves
  const [heroCtaVisible, setHeroCtaVisible] = useState(true);
  useEffect(() => {
    const heroCta = document.querySelector('[data-hero-cta]');
    if (!heroCta) return;
    const io = new IntersectionObserver(([entry]) => setHeroCtaVisible(entry.isIntersecting));
    io.observe(heroCta);
    return () => io.disconnect();
  }, []);

  // Hide on scroll down, show on scroll up. ScrollTrigger reads the direction (no raw listener);
  // reduced motion swaps the slide for an instant change.
  useGSAP(
    () => {
      const el = headerRef.current;
      if (!el) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let hidden = false;
      const setHidden = (next: boolean) => {
        if (next === hidden) return;
        hidden = next;
        gsap.to(el, {
          yPercent: next ? -100 : 0,
          duration: reduce ? 0 : T.dur4,
          ease: next ? 'power2.in' : 'power3.out',
          overwrite: true,
        });
      };
      setHiddenRef.current = setHidden;

      const trigger = ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          if (menuOpenRef.current || self.scroll() < REVEAL_ZONE_PX) setHidden(false);
          else setHidden(self.direction === 1);
        },
      });
      return () => trigger.kill();
    },
    { scope: headerRef }
  );

  // An open menu keeps the nav on screen
  useEffect(() => {
    menuOpenRef.current = menuOpen;
    if (menuOpen) setHiddenRef.current(false);
  }, [menuOpen]);

  const links = [
    { href: '#how', label: n.how },
    { href: '#pricing', label: n.prices },
    { href: '#security', label: n.security },
    { href: '#sellers', label: n.sellers },
    { href: '#faq', label: n.faq },
  ];

  const linkClass =
    'text-body font-medium text-fg-muted hover:text-fg outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 rounded-xs';

  return (
    <>
      <div ref={sentinel} className="absolute top-0 h-px w-px" aria-hidden="true" />
      <header
        ref={headerRef}
        // Keyboard users tabbing into a hidden nav bring it back
        onFocusCapture={() => setHiddenRef.current(false)}
        className={`fixed top-0 inset-x-0 z-header h-18 transition-colors dur-3 ease-standard border-b ${
          scrolled ? 'nav-glass border-line-subtle' : 'bg-transparent border-transparent'
        }`}
      >
        <div className="container-landing h-full px-5 md:px-8 xl:px-13 flex items-center justify-between gap-5">
          <span className={`transition-opacity dur-3 ease-standard ${footerVisible ? 'opacity-0 invisible' : ''}`}>
            <Logo variant="full" tone="auto" height={32} linkHome />
          </span>

          <nav aria-label={n.menu} className="hidden lg:flex items-center gap-8">
            {links.map((l) => (
              <a key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeLabel}
              title={themeLabel}
              className="size-11 inline-flex items-center justify-center rounded-sm text-fg-muted hover:text-fg hover:bg-state-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 transition-colors dur-2 ease-standard"
            >
              {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </button>
            {hasSession ? (
              <ButtonLink to="/app" variant="primary" size="md" className="max-sm:hidden">
                {n.dashboard}
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost" size="md" className="max-sm:hidden">
                  {n.login}
                </ButtonLink>
                {!heroCtaVisible && (
                  <ButtonLink to="/signup" variant="accent" size="md" className="max-sm:hidden">
                    {n.openAccount}
                  </ButtonLink>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label={n.menu}
              className="lg:hidden size-11 inline-flex items-center justify-center rounded-sm text-fg hover:bg-state-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
            >
              {menuOpen ? <XIcon size={24} /> : <ListIcon size={24} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav aria-label={n.menu} className="lg:hidden nav-glass border-b border-line-subtle px-5 pb-5">
            <ul className="m-0 p-0 list-none flex flex-col">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setMenuOpen(false)} className={`block py-3 ${linkClass}`}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 pt-3 sm:hidden">
              <Link
                to={hasSession ? '/app' : '/login'}
                className="flex-1 text-center py-3 text-body font-medium text-fg-link"
              >
                {hasSession ? n.dashboard : n.login}
              </Link>
            </div>
          </nav>
        )}
      </header>
    </>
  );
};
