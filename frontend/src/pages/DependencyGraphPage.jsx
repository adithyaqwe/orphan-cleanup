import React, { useState, useEffect, useMemo } from 'react';
import { ReactFlow, Controls, Background, MiniMap, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../services/api';
import GoldenRuleBanner from '../components/GoldenRuleBanner';
import StatusBadge from '../components/StatusBadge';
import Tooltip from '../components/Tooltip';
import { formatResourceType } from '../utils/formatters';
import { RefreshCw, Network, GitBranch, Play, Server, CheckCircle2, ShieldCheck } from 'lucide-react';

const PipelineNode = ({ data }) => (
  <div style={{
    background: 'rgba(18, 18, 18, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1.5px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '14px',
    padding: '0.85rem 1.1rem',
    color: '#ffffff',
    minWidth: '200px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 255, 255, 0.15)',
  }}>
    <Handle type="target" position={Position.Left} style={{ background: '#ffffff', width: 10, height: 10 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
      <GitBranch size={16} color="#ffffff" />
      <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        AUTOMATION
      </span>
    </div>
    <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#ffffff', marginBottom: '0.2rem' }}>
      {data.label}
    </div>
    <div style={{ fontSize: '0.78rem', color: '#a1a1aa', fontWeight: '600' }}>
      Process: <span style={{ color: '#ffffff' }}>{data.provider || 'Automation Process'}</span>
    </div>
    <Handle type="source" position={Position.Right} style={{ background: '#ffffff', width: 10, height: 10 }} />
  </div>
);

const RunNode = ({ data }) => (
  <div style={{
    background: 'rgba(18, 18, 18, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1.5px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '14px',
    padding: '0.85rem 1.1rem',
    color: '#ffffff',
    minWidth: '190px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
  }}>
    <Handle type="target" position={Position.Left} style={{ background: '#ffffff', width: 10, height: 10 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
      <Play size={15} color="#ffffff" />
      <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        WORK
      </span>
    </div>
    <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#ffffff', marginBottom: '0.2rem' }}>
      {data.label}
    </div>
    <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
      Status: <span style={{ color: '#ffffff', fontWeight: '800' }}>{data.status === 'CRASHED' ? 'Stopped' : data.status}</span>
    </div>
    <Handle type="source" position={Position.Right} style={{ background: '#ffffff', width: 10, height: 10 }} />
  </div>
);

const ResourceNode = ({ data }) => (
  <div style={{
    background: 'rgba(18, 18, 18, 0.95)',
    backdropFilter: 'blur(12px)',
    border: data.isAdopted
      ? '1.5px solid rgba(255, 255, 255, 0.5)'
      : '1.5px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '14px',
    padding: '0.85rem 1.1rem',
    color: '#ffffff',
    minWidth: '220px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 255, 255, 0.1)',
  }}>
    <Handle type="target" position={Position.Left} style={{ background: '#ffffff', width: 10, height: 10 }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Server size={16} color="#ffffff" />
        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {formatResourceType(data.type)}
        </span>
      </div>
      {data.isAdopted && (
        <span style={{
          fontSize: '0.68rem',
          fontWeight: '800',
          padding: '0.15rem 0.5rem',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          <CheckCircle2 size={10} /> NOW USED BY NEW WORK
        </span>
      )}
    </div>
    <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#ffffff', marginBottom: '0.4rem' }}>
      {data.label}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: '600' }}>
        Used by: <strong style={{ color: '#ffffff' }}>{data.isAdopted ? 'New Work' : 'Nobody'}</strong>
      </span>
      <StatusBadge status={data.state} />
    </div>
    <Handle type="source" position={Position.Right} style={{ background: '#ffffff', width: 10, height: 10 }} />
  </div>
);

export default function DependencyGraphPage() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);

  const nodeTypes = useMemo(
    () => ({
      pipelineNode: PipelineNode,
      runNode: RunNode,
      resourceNode: ResourceNode,
    }),
    []
  );

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/resources?limit=50');
      const resources = res.success ? res.data : [];

      const builtNodes = [];
      const builtEdges = [];

      // Automation nodes (left column x: 40)
      const pipelines = [
        { id: 'pipe-preview-builds', label: 'Automation Process A', provider: 'GitHub Actions', x: 40, y: 80 },
        { id: 'pipe-data-ingest',    label: 'Automation Process B', provider: 'GCP Cloud Build', x: 40, y: 400 },
        { id: 'pipe-ml-training',    label: 'Automation Process C', provider: 'Azure DevOps', x: 40, y: 620 },
      ];

      pipelines.forEach((p) =>
        builtNodes.push({ id: p.id, type: 'pipelineNode', position: { x: p.x, y: p.y }, data: { label: p.label, provider: p.provider } })
      );

      // Work nodes (middle column x: 380)
      const runs = [
        { id: 'run-crashed-101',         label: 'Old Work (Stopped)',       status: 'Stopped',   owner: 'CI Bot',                  pipelineId: 'pipe-preview-builds', x: 380, y: 20  },
        { id: 'run-active-202',          label: 'Active Work',              status: 'Active',    owner: 'devops@demo.internal',    pipelineId: 'pipe-preview-builds', x: 380, y: 140 },
        { id: 'run-crashed-parent-303',  label: 'Old Work #303 (Stopped)',  status: 'Stopped',   owner: 'CI Bot',                  pipelineId: 'pipe-preview-builds', x: 380, y: 320 },
        { id: 'run-adopting-active-404', label: 'New Work #404 (Active)',   status: 'Active',    owner: 'operator@demo.internal',  pipelineId: 'pipe-data-ingest',    x: 380, y: 420 },
        { id: 'run-batch-gcp-505',       label: 'Batch Work #505',          status: 'Cleaned',   owner: 'batch-runner-gcp',        pipelineId: 'pipe-data-ingest',    x: 380, y: 520 },
        { id: 'run-ml-azure-606',        label: 'ML Work #606',             status: 'Active',    owner: 'mlops@demo.internal',     pipelineId: 'pipe-ml-training',    x: 380, y: 620 },
      ];

      runs.forEach((r) => {
        builtNodes.push({ id: r.id, type: 'runNode', position: { x: r.x, y: r.y }, data: { label: r.label, status: r.status, owner: r.owner } });
        builtEdges.push({
          id: `e-${r.pipelineId}-${r.id}`,
          source: r.pipelineId,
          target: r.id,
          animated: r.status === 'Active',
          style: { stroke: '#ffffff', strokeWidth: 2 },
        });
      });

      // Explicit layout map for Resource nodes (right column x: 720) to avoid overlaps
      const resourceLayoutMap = {
        'res-orphan-server-a':   { runId: 'run-crashed-101',         y: 20 },
        'res-orphan-ec2-b2':     { runId: 'run-crashed-101',         y: 120 },
        'res-active-server-b':   { runId: 'run-active-202',          y: 220 },
        'res-orphan-k8s-c3':     { runId: 'run-crashed-parent-303',  y: 320 },
        'res-adopted-child-c1':  { runId: 'run-adopting-active-404', y: 420 },
        'res-pending-gcp-f6':    { runId: 'run-batch-gcp-505',       y: 520 },
        'res-azure-ml-i9':       { runId: 'run-ml-azure-606',        y: 620 },
      };

      const visibleResources = resources.filter((r) => resourceLayoutMap[r.resourceId]);
      visibleResources.forEach((r) => {
        const layout = resourceLayoutMap[r.resourceId];
        builtNodes.push({
          id: r.resourceId,
          type: 'resourceNode',
          position: { x: 720, y: layout.y },
          data: { label: r.name, resourceId: r.resourceId, type: r.type, state: r.state, isAdopted: r.adoption?.isAdopted },
        });

        // Primary connection edge
        builtEdges.push({
          id: `e-${layout.runId}-${r.resourceId}`,
          source: layout.runId,
          target: r.resourceId,
          label: r.adoption?.isAdopted ? 'Now Used By' : 'Created',
          animated: r.state === 'ACTIVE' || r.state === 'PROTECTED',
          style: {
            stroke: r.adoption?.isAdopted ? '#ffffff' : r.state === 'VERIFIED_ORPHAN' ? '#a1a1aa' : '#ffffff',
            strokeWidth: r.adoption?.isAdopted ? 2.5 : 1.5,
          },
          labelStyle: { fill: '#ffffff', fontWeight: 800, fontSize: '0.72rem' },
          labelBgStyle: { fill: '#000000', fillOpacity: 0.95, rx: 6, ry: 6 },
          labelBgPadding: [6, 4],
        });

        // For adopted resource, add secondary edge showing original creator ("Old Work #303")
        if (r.adoption?.isAdopted) {
          builtEdges.push({
            id: `e-run-crashed-parent-303-${r.resourceId}`,
            source: 'run-crashed-parent-303',
            target: r.resourceId,
            label: 'Created',
            animated: false,
            style: { stroke: '#71717a', strokeWidth: 1.5, strokeDasharray: '4 4' },
            labelStyle: { fill: '#a1a1aa', fontWeight: 700, fontSize: '0.7rem' },
            labelBgStyle: { fill: '#000000', fillOpacity: 0.95, rx: 4, ry: 4 },
            labelBgPadding: [4, 3],
          });
        }
      });

      setNodes(builtNodes);
      setEdges(builtEdges);
    } catch (err) {
      console.error('Resource Connections graph fetch error:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div className="card-easy-trip" style={{ flex: 1, overflow: 'hidden', position: 'relative', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa' }}>
            <RefreshCw size={32} className="spin" style={{ color: '#ffffff', marginBottom: '0.8rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>Rendering Resource Connections Graph...</div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.1, includeHiddenNodes: true }}
            style={{ background: '#000000' }}
          >
            <Controls
              style={{
                background: 'rgba(18, 18, 18, 0.95)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
              }}
            />
            <Background color="rgba(255, 255, 255, 0.15)" gap={20} size={1} />
            <MiniMap
              style={{
                background: 'rgba(18, 18, 18, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
              }}
              nodeColor={() => '#ffffff'}
              maskColor="rgba(0, 0, 0, 0.8)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
