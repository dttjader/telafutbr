'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

const navLinks = [
  { href: '/', label: 'Rodadas' },
  { href: '/tabela', label: 'Tabela' },
  { href: '/artilharia', label: 'Artilharia' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🇧🇷</span>
          <div>
            <div className={styles.logoTitle}>BRASILEIRÃO</div>
            <div className={styles.logoSub}>Série A · 2024</div>
          </div>
        </Link>
        <nav className={styles.nav}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
