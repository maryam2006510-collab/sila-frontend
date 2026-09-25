// src/features/landing/LandingNav.tsx
// Landing nav per UI Kit 08-ux §12 #1 & 05-logo §4.1: logo 32, section links, ghost login,
// gold "افتح حسابك" (D20). At the top it spans the container, transparent. Once scrolled it stays
// on screen and condenses into a floating glass bar sized to its content (D29): one Motion
// layout (FLIP) animation, transforms only, corners from the radius ladder (13 around 8 + 5).

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ListIcon, MoonIcon, SunIcon, XIcon } from '@phosphor-icons/react';
import { useThemeStore } from '@/app/theme';
import { Logo } from '@/components/ui/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { useSessionStore } from '@/lib/session';
import { radius, spring, transition } from '@/motion/tokens';
import { useT } from '@/i18n';

const SECTION_IDS = ['how', 'pricing', 'security', 'sellers', 'faq'] as const;
type SectionId = (typeof SECTION_IDS)[number];

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The current section: the last one (in page order) reaching into the upper half of the viewport.
// Derived from the set of intersecting sections, so fast jumps never leave it stale. IntersectionObserver
// only (07-motion §1 rule 6).
const useActiveSection = (ready: boolean) => {
  const [active, setActive] = useState<SectionId | null>(null);
  useEffect(() => {
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
        setActive(SECTION_IDS.filter((id) => visible.has(id)).at(-1) ?? null);
      },
      { rootMargin: '0px 0px -50% 0px' }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ready]);
  return active;
};

// `ready`: the sections below the hero have mounted (LandingPage renders them after the first
// paint), so the observers below can find them
export const LandingNav: React.FC<{ ready: boolean }> = ({ ready }) => {
  const t = useT();
  const n = t.landing.nav;
  const hasSession = useSessionStore((s) => s.hasSession);
  const { theme, toggleTheme } = useThemeStore();
  const themeLabel = theme === 'dark' ? t.shell.themeToLight : t.shell.themeToDark;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const active = useActiveSection(ready);

  // No scroll listeners (07-motion §1 rule 6): a sentinel at the top of the page
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The logo never appears twice in one viewport (05-logo §6): it leaves the bar while the footer shows
  const [footerVisible, setFooterVisible] = useState(false);
  useEffect(() => {
    const footer = document.getElementById('landing-footer');
    if (!footer) return;
    const io = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    io.observe(footer);
    return () => io.disconnect();
  }, [ready]);

  // One gold button per viewport (01-color §2): the nav's gold CTA waits while the hero's or the
  // final band's is on screen
  const [goldCtasVisible, setGoldCtasVisible] = useState(1);
  useEffect(() => {
    const ctas = document.querySelectorAll('[data-gold-cta]');
    if (!ctas.length) return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      setGoldCtasVisible(seen.size);
    });
    ctas.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready]);
  const heroCtaVisible = goldCtasVisible > 0;

  // Escape closes the phone menu
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const links = [
    { id: 'how', label: n.how },
    { id: 'pricing', label: n.prices },
    { id: 'security', label: n.security },
    { id: 'sellers', label: n.sellers },
    { id: 'faq', label: n.faq },
  ] as const;

  // Native anchors, glided: the section's scroll-margin clears the bar (base.css .landing-anchor)
  const goTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    setMenuOpen(false);
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    target.scrollIntoView({ behavior, block: 'start' });
    // Sections rendered on the way (content-visibility, D35) can move the target: settle on it once
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    window.addEventListener(
      'scrollend',
      () => {
        if (Math.abs(target.getBoundingClientRect().top - margin) > 4)
          target.scrollIntoView({ behavior, block: 'start' });
      },
      { once: true }
    );
    history.replaceState(null, '', `#${id}`);
  };

  const compact = scrolled || menuOpen;
  // Motion re-measures layout components only when this changes, not on every hover or section
  // change while scrolling (each measure is a layout read of the page, D35)
  const shape = `${compact}-${menuOpen}-${footerVisible}-${goldCtasVisible > 0}-${hasSession}`;
  const showLogo = !footerVisible;
  const focusRing = 'outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35';
  const iconButton = `size-11 lg:size-10 inline-flex items-center justify-center rounded-sm text-fg-muted hover:text-fg hover:bg-state-hover transition-colors dur-2 ease-standard ${focusRing}`;

  return (
    <>
      <div ref={sentinel} className="absolute top-0 h-px w-px" aria-hidden="true" />
      <header
        className={`fixed top-0 inset-x-0 z-header flex justify-center pointer-events-none ${
          compact ? 'px-3 pt-3 sm:px-5' : ''
        }`}
      >
        <m.div
          layout
          layoutDependency={shape}
          transition={spring.calm}
          style={{ borderRadius: radius.md }}
          className={`pointer-events-auto flex flex-col border transition-surface dur-3 ease-standard ${
            compact ? 'w-full lg:w-auto nav-glass border-line shadow-lg' : 'w-full container-landing border-transparent'
          }`}
        >
          <m.div
            layout
            layoutDependency={shape}
            transition={spring.calm}
            className={`flex items-center justify-between ${
              compact ? 'h-14 lg:h-12.5 ps-4 pe-1.5 lg:pe-1.25 gap-6' : 'h-18 px-5 md:px-8 xl:px-13 gap-5'
            }`}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {showLogo && (
                <m.span
                  key="logo"
                  layout="position"
                  layoutDependency={shape}
                  transition={spring.calm}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: transition.fade }}
                  exit={{ opacity: 0, transition: transition.exit }}
                  className="flex"
                >
                  <Logo variant="full" tone="auto" height={32} linkHome />
                </m.span>
              )}
            </AnimatePresence>

            <m.nav
              layout="position"
              layoutDependency={shape}
              transition={spring.calm}
              aria-label={n.menu}
              className="hidden lg:flex items-center gap-1"
              onMouseLeave={() => setHovered(null)}
            >
              {links.map((l) => {
                const isActive = scrolled && active === l.id;
                return (
                  <a
                    key={l.id}
                    href={`#${l.id}`}
                    onClick={(e) => goTo(e, l.id)}
                    onMouseEnter={() => setHovered(l.id)}
                    onFocus={() => setHovered(l.id)}
                    onBlur={() => setHovered(null)}
                    aria-current={isActive ? 'location' : undefined}
                    className={`relative inline-flex items-center h-control-md px-3 rounded-sm text-body font-medium transition-colors dur-2 ease-standard ${focusRing} ${
                      isActive || hovered === l.id ? 'text-fg' : 'text-fg-muted'
                    }`}
                  >
                    {/* One hover surface that glides between links instead of blinking per link */}
                    <AnimatePresence>
                      {hovered === l.id && (
                        <m.span
                          layoutId="landing-nav-hover"
                          transition={spring.snappy}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: transition.fade }}
                          exit={{ opacity: 0, transition: transition.exit }}
                          style={{ borderRadius: radius.sm }}
                          className="absolute inset-0 bg-muted"
                          aria-hidden="true"
                        />
                      )}
                    </AnimatePresence>
                    <span className="relative">{l.label}</span>
                    {/* Current section: a short Sila Cut bar that slides from section to section */}
                    {isActive && (
                      <m.span
                        layoutId="landing-nav-active"
                        transition={spring.snappy}
                        className="absolute bottom-0.5 inset-x-3 h-0.5 sila-cut bg-state-indicator"
                        aria-hidden="true"
                      />
                    )}
                  </a>
                );
              })}
            </m.nav>

            <m.div
              layout="position"
              layoutDependency={shape}
              transition={spring.calm}
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={themeLabel}
                title={themeLabel}
                className={iconButton}
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
                aria-controls="landing-menu"
                aria-label={n.menu}
                className={`lg:hidden ${iconButton} text-fg`}
              >
                {menuOpen ? <XIcon size={24} /> : <ListIcon size={24} />}
              </button>
            </m.div>
          </m.div>

          <AnimatePresence initial={false}>
            {menuOpen && (
              <m.nav
                key="menu"
                id="landing-menu"
                layout="position"
                layoutDependency={shape}
                aria-label={n.menu}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0, transition: transition.reveal }}
                exit={{ opacity: 0, transition: transition.exit }}
                className="lg:hidden px-1.5 pb-1.5"
              >
                <ul className="m-0 p-0 pt-1 border-t border-line-subtle list-none flex flex-col">
                  {links.map((l) => (
                    <li key={l.id}>
                      <a
                        href={`#${l.id}`}
                        onClick={(e) => goTo(e, l.id)}
                        aria-current={scrolled && active === l.id ? 'location' : undefined}
                        className={`flex items-center h-12 px-3 rounded-sm text-body font-medium hover:bg-state-hover transition-colors dur-2 ease-standard ${focusRing} ${
                          scrolled && active === l.id ? 'text-fg' : 'text-fg-muted'
                        }`}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-2 sm:hidden">
                  <ButtonLink to={hasSession ? '/app' : '/login'} variant="secondary" size="lg" fullWidth>
                    {hasSession ? n.dashboard : n.login}
                  </ButtonLink>
                  {!hasSession && (
                    // Gold only once the hero's gold button is off screen (01-color §2)
                    <ButtonLink to="/signup" variant={heroCtaVisible ? 'primary' : 'accent'} size="lg" fullWidth>
                      {n.openAccount}
                    </ButtonLink>
                  )}
                </div>
              </m.nav>
            )}
          </AnimatePresence>
        </m.div>
      </header>
    </>
  );
};
