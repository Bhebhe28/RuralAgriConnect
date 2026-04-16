import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Request {
  request_id: string;
  resource_type: string;
  quantity: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string;
  created_at: string;
  farmer_name?: string;
  farmer_phone?: string;
  farmer_region?: string;
  farmer_crops?: string;
  reviewed_by_name?: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending:  'badge-orange',
  approved: 'badge-green',
  rejected: 'badge-red',
};

const STATUS_ICON: Record<string, string> = {
  pending: '⏳', approved: '✅', rejected: '❌',
};

export default function SubsidyRequest() {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [saved, setSaved]       = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const [form, setForm] = useState({
    resource_type: 'Seeds', quantity: '', reason: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [reqs, types] = await Promise.all([
        api.get(isAdmin ? '/subsidies' : '/subsidies/mine').then(r => r.data),
        api.get('/subsidies/resource-types').then(r => r.data),
      ]);
      setRequests(reqs);
      setResourceTypes(types);
      if (types.length > 0) setForm(f => ({ ...f, resource_type: types[0] }));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/subsidies', form);
      setSaved('✅ Request submitted! An officer will review it shortly.');
      setShowForm(false);
      setForm({ resource_type: resourceTypes[0] || 'Seeds', quantity: '', reason: '' });
      load();
      setTimeout(() => setSaved(''), 5000);
    } catch (err: any) {
      setSaved('❌ ' + (err.response?.data?.error || 'Failed to submit'));
    }
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/subsidies/${id}/review`, { status, review_notes: reviewNote });
      setReviewing(null);
      setReviewNote('');
      load();
    } catch {}
  };

  const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-serif">📦 Resource Requests</h2>
          <p className="text-sm text-muted mt-0.5">
            {isAdmin
              ? `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''} awaiting review`
              : 'Request seeds, fertilizer, equipment and other farming resources'}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowForm(s => !s)} className="btn-primary">
            {showForm ? '✕ Cancel' : '+ New Request'}
          </button>
        )}
      </div>

      {saved && (
        <div className={`rounded-xl px-4 py-3 mb-5 text-sm border animate-fade-in ${
          saved.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>{saved}</div>
      )}

      {/* Request form */}
      {showForm && (
        <div className="card animate-scale-in mb-6">
          <h3 className="font-serif text-lg mb-1">📝 Submit Resource Request</h3>
          <p className="text-sm text-muted mb-4">Your request will be reviewed by an agricultural officer</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Resource Type</label>
              <div className="flex flex-wrap gap-2">
                {resourceTypes.map(rt => (
                  <button key={rt} type="button"
                    onClick={() => setForm(f => ({ ...f, resource_type: rt }))}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
                      form.resource_type === rt ? 'bg-forest text-white border-forest' : 'bg-white border-sand text-dark hover:border-moss'
                    }`}>
                    {rt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Quantity Needed</label>
              <input className="input" placeholder="e.g. 50kg of maize seed, 2 bags of fertilizer"
                value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Reason / Motivation</label>
              <textarea className="input resize-none" rows={3}
                placeholder="Explain why you need this resource and how it will be used on your farm…"
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
            </div>
            <button type="submit" className="btn-primary w-full py-3">Submit Request</button>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
              filterStatus === s ? 'bg-forest text-white border-forest' : 'bg-white border-sand text-muted hover:border-moss'
            }`}>
            {s === 'all' ? 'All' : STATUS_ICON[s] + ' ' + s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-12 text-muted">Loading requests…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-muted">No {filterStatus === 'all' ? '' : filterStatus} requests yet.</p>
          {!isAdmin && <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Make Your First Request</button>}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => (
            <div key={r.request_id} className="card mb-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-dark">{r.resource_type}</span>
                    <span className={`badge ${STATUS_STYLE[r.status]}`}>{STATUS_ICON[r.status]} {r.status}</span>
                  </div>
                  {isAdmin && (
                    <p className="text-sm font-medium text-forest mb-1">
                      👤 {r.farmer_name} · {r.farmer_phone} · {r.farmer_region?.split('—')[1]?.trim()}
                    </p>
                  )}
                  <p className="text-sm text-muted"><span className="font-medium text-dark">Quantity:</span> {r.quantity}</p>
                  <p className="text-sm text-muted mt-1"><span className="font-medium text-dark">Reason:</span> {r.reason}</p>
                  {r.review_notes && (
                    <p className="text-sm mt-2 bg-sand rounded-lg px-3 py-2">
                      <span className="font-medium">Officer note:</span> {r.review_notes}
                    </p>
                  )}
                  <p className="text-xs text-muted mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>

                {/* Admin review buttons */}
                {isAdmin && r.status === 'pending' && reviewing !== r.request_id && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setReviewing(r.request_id)}
                      className="btn-primary text-xs px-3 py-2">Review</button>
                  </div>
                )}
              </div>

              {/* Inline review panel */}
              {isAdmin && reviewing === r.request_id && (
                <div className="mt-4 pt-4 border-t border-sand animate-fade-in">
                  <textarea className="input resize-none mb-3" rows={2}
                    placeholder="Add a note for the farmer (optional)…"
                    value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => handleReview(r.request_id, 'approved')}
                      className="btn-moss flex-1 py-2.5">✅ Approve</button>
                    <button onClick={() => handleReview(r.request_id, 'rejected')}
                      className="btn-danger flex-1 py-2.5">❌ Reject</button>
                    <button onClick={() => { setReviewing(null); setReviewNote(''); }}
                      className="btn-outline px-4">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
