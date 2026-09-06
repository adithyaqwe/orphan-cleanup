import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import BubbleBackground from '../components/BubbleBackground';
import MagneticButton from '../components/MagneticButton';
import MagneticLink from '../components/MagneticLink';
import Tooltip from '../components/Tooltip';
import {
  LayoutGrid,
  Zap,
  Network,
  Server,
  Shield,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Bell,
  Search,
  User,
} from 'lucide-react';

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState(null);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Cloud Resources', path: '/inventory', icon: Server },
    { label: 'Cleanup & Audit', path: '/cleanup', icon: Shield },
  ];

  const userName = user?.name || 'Alex Admin';
  const firstName = userName.split(' ')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
      <BubbleBackground />

      {/* Top Navigation Header Bar */}
      <header
        style={{
          backgroundColor: 'rgba(5, 5, 5, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '0.85rem 1.75rem',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          gap: '1rem',
          boxShadow: '0 4px 25px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifySelf: 'start' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#ffffff',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '1.1rem',
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.3)',
            }}
          >
            O
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.02em', color: '#ffffff' }}>
            ORPHAN-CLEANUP
          </span>
        </div>

        {/* Navigation Tabs (Centered Upper Middle) */}
        <nav
          aria-label="Main Navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            padding: '0.3rem',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            justifySelf: 'center',
          }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <MagneticLink
                key={item.path}
                to={item.path}
                strength={0.25}
                style={{
                  padding: '0.45rem 1rem',
                  minHeight: '36px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '9999px',
                  fontSize: '0.83rem',
                  fontWeight: isActive ? '800' : '600',
                  color: isActive ? '#000000' : '#a1a1aa',
                  background: isActive
                    ? '#ffffff'
                    : 'transparent',
                  textDecoration: 'none',
                  boxShadow: isActive ? '0 0 16px rgba(255, 255, 255, 0.35)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {Icon && <Icon size={14} color={isActive ? '#000000' : '#a1a1aa'} />}
                {item.label}
              </MagneticLink>
            );
          })}
        </nav>

        {/* Empty Spacer to Balance Grid Centering */}
        <div style={{ justifySelf: 'end' }} />
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            backgroundColor: '#ffffff',
            color: '#000000',
            border: '1px solid #ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '0.9rem',
            boxShadow: '0 10px 30px rgba(255, 255, 255, 0.2)',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem 2.2rem', overflowY: 'auto' }}>{children}</main>
    </div>
  );
}

