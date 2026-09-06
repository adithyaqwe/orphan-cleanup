import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import MagneticButton from '../components/MagneticButton';
import MagneticLink from '../components/MagneticLink';
import { formatResourceType } from '../utils/formatters';
import { Search, Filter, RefreshCw, Eye, X, Server } from 'lucide-react';

export default function InventoryPage() {
  const [resources, setResources] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [page, setPage] = useState(1);

  const searchInputRef = useRef(null);

  // Focus search input on '/' keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [search, stateFilter, providerFilter, page]);

  // Auto-refresh when user navigates back to this tab/page from detail page
  useEffect(() => {
    const onFocus = () => fetchInventory();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (stateFilter) params.append('state', stateFilter);
      if (providerFilter) params.append('provider', providerFilter);
      params.append('page', page);
      params.append('limit', 10);

      const res = await api.get(`/resources?${params.toString()}`);
      if (res.success) {
        setResources(res.data);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStateFilter('');
    setProviderFilter('');
    setPage(1);
  };

  const isFiltered = Boolean(search || stateFilter || providerFilter);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', color: '#ffffff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Server size={28} style={{ color: '#ffffff' }} /> Cloud Infrastructure Inventory
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '0.25rem' }}>
            Comprehensive catalog of managed cloud compute, storage, and database resources &bull; Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.78rem' }}>/</kbd> to search
          </p>
        </div>
        <MagneticButton
          onClick={fetchInventory}
          className="btn-outline-cyan"
          strength={0.3}
          style={{ padding: '0.65rem 1.35rem', fontSize: '0.88rem' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh List
        </MagneticButton>
      </div>

      {/* Filter & Search Bar */}
      <div className="animated-card card-glass-cyan" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.75rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by ID or name... (Press '/' to focus)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '0.7rem 2.8rem 0.7rem 2.8rem',
              backgroundColor: 'rgba(6, 9, 14, 0.8)',
              border: '1px solid rgba(34, 211, 238, 0.25)',
              borderRadius: '9999px',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              fontWeight: '500',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.88rem', fontWeight: '700' }}>
            <Filter size={16} /> Filter by:
          </div>

          <select
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
            style={{
              padding: '0.7rem 1.25rem',
              backgroundColor: 'rgba(6, 9, 14, 0.8)',
              border: '1px solid rgba(34, 211, 238, 0.25)',
              borderRadius: '9999px',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Resource States</option>
            <option value="ACTIVE">Active Workload</option>
            <option value="PROTECTED">Protected</option>
            <option value="ORPHAN_CANDIDATE">Under Review</option>
            <option value="VERIFIED_ORPHAN">Ready for Cleanup</option>
            <option value="NEEDS_REVIEW">Requires Audit</option>
            <option value="RECLAIMED">Cleaned Up</option>
          </select>

          <select
            value={providerFilter}
            onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
            style={{
              padding: '0.7rem 1.25rem',
              backgroundColor: 'rgba(6, 9, 14, 0.8)',
              border: '1px solid rgba(34, 211, 238, 0.25)',
              borderRadius: '9999px',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Cloud Providers</option>
            <option value="AWS">AWS Cloud</option>
            <option value="AZURE">Microsoft Azure</option>
            <option value="GCP">Google Cloud Platform</option>
          </select>

          {isFiltered && (
            <MagneticButton
              onClick={clearFilters}
              className="btn-outline-cyan"
              strength={0.2}
              style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', gap: '0.35rem' }}
            >
              <X size={14} /> Clear Filters
            </MagneticButton>
          )}
        </div>
      </div>

      {/* Inventory Table & Empty State */}
      <div className="animated-card card-glass-cyan" style={{ padding: '0', borderRadius: '24px', overflow: 'hidden', animationDelay: '0.1s' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Loading cloud infrastructure inventory...</div>
        ) : resources.length === 0 ? (
          <EmptyState
            icon={Server}
            title={isFiltered ? 'No Matching Resources' : 'Inventory Empty'}
            description={
              isFiltered
                ? 'No resources match your search or filter selection. Try clearing your search query or selecting a different status filter.'
                : 'No cloud resources have been registered in the system yet.'
            }
            actionText={isFiltered ? 'Reset All Filters' : 'Refresh Telemetry'}
            onAction={isFiltered ? clearFilters : fetchInventory}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', backgroundColor: 'rgba(18, 18, 18, 0.95)', color: '#a1a1aa', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1.1rem 1.25rem' }}>RESOURCE</th>
                  <th style={{ padding: '1.1rem 1.25rem' }}>TYPE</th>
                  <th style={{ padding: '1.1rem 1.25rem' }}>STATUS</th>
                  <th style={{ padding: '1.1rem 1.25rem' }}>USED BY</th>
                  <th style={{ padding: '1.1rem 1.25rem' }}>AGE</th>
                  <th style={{ padding: '1.1rem 1.25rem', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => {
                  const ageHours = Math.max(1, Math.round((Date.now() - new Date(r.creationTime || Date.now()).getTime()) / (1000 * 3600)));
                  return (
                    <tr key={r.resourceId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '1.1rem 1.25rem', fontWeight: '800', color: '#ffffff' }}>
                        <Link to={`/resources/${r.resourceId}`} style={{ color: '#ffffff', textDecoration: 'none' }}>
                          {r.name || r.resourceId}
                        </Link>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>
                          {r.resourceId}
                        </div>
                      </td>
                      <td style={{ padding: '1.1rem 1.25rem', color: '#a1a1aa', fontWeight: '600' }}>
                        {formatResourceType(r.type)}
                      </td>
                      <td style={{ padding: '1.1rem 1.25rem' }}>
                        <StatusBadge status={r.state} />
                      </td>
                      <td style={{ padding: '1.1rem 1.25rem', color: '#ffffff', fontWeight: '600' }}>
                        {r.adoption?.isAdopted ? 'New Work' : r.owner?.email ? r.owner.email : 'Nobody'}
                      </td>
                      <td style={{ padding: '1.1rem 1.25rem', color: '#a1a1aa', fontWeight: '600' }}>
                        {ageHours} hours
                      </td>
                      <td style={{ padding: '1.1rem 1.25rem', textAlign: 'right' }}>
                        <Tooltip content="Inspect resource details and safety rules">
                          <MagneticLink
                            to={`/resources/${r.resourceId}`}
                            className="btn-outline-cyan"
                            strength={0.25}
                            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', gap: '0.4rem' }}
                          >
                            <Eye size={14} /> Inspect
                          </MagneticLink>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {resources.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(6, 9, 14, 0.9)', borderTop: '1px solid rgba(34, 211, 238, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', color: '#94a3b8' }}>
            <div>
              Showing Page <strong style={{ color: '#ffffff' }}>{pagination.page}</strong> of <strong style={{ color: '#ffffff' }}>{pagination.pages}</strong> ({pagination.total} Total Resources)
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <MagneticButton
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-outline-cyan"
                strength={0.2}
                style={{ padding: '0.45rem 1.1rem', opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
              >
                Previous
              </MagneticButton>
              <MagneticButton
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="btn-outline-cyan"
                strength={0.2}
                style={{ padding: '0.45rem 1.1rem', opacity: page >= pagination.pages ? 0.4 : 1, cursor: page >= pagination.pages ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
              >
                Next
              </MagneticButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
