import React, { useState } from 'react';
import { Building2, Plus, Check, X, ShieldAlert } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useAuthStore } from '../../../store/authStore';
import { useHospitals, useCreateHospital } from '../../../hooks/useHospitals';

// Platform-owner-only screen to onboard hospitals. Each hospital created here
// becomes a tenant record that doctors select at sign-up. See MULTI_TENANT_PLAN.md.
export const HospitalManagement: React.FC = () => {
  const { profile } = useAuthStore();
  const isPlatform = (profile as any)?.app_role === 'platform';

  const { data: hospitals = [], isLoading } = useHospitals();
  const createHospital = useCreateHospital();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Defense in depth: the sidebar already hides this, but guard the page too.
  if (!isPlatform) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Not available</h2>
        <p className="text-gray-600">This area is restricted to the platform owner.</p>
      </div>
    );
  }

  const resetForm = () => {
    setName(''); setCity(''); setState(''); setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createHospital.mutate(
      { name, city, state },
      { onSuccess: resetForm }
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary-600" /> Hospitals
        </h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} className="mr-2" /> Add hospital
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Hospitals you have onboarded. Each appears in the doctor sign-up dropdown.
      </p>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 mb-5"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-3">
            <Plus size={16} /> New hospital
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hospital name — e.g. Navachetana Hospital"
              className="sm:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <Button type="submit" disabled={createHospital.isPending || !name.trim()}>
              <Check size={16} className="mr-1" />
              {createHospital.isPending ? 'Saving…' : 'Save hospital'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              <X size={16} className="mr-1" /> Cancel
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : hospitals.length === 0 ? (
        <div className="text-center text-gray-500 border border-dashed border-gray-300 rounded-lg py-10">
          No hospitals yet. Click “Add hospital” to onboard the first one.
        </div>
      ) : (
        <div className="space-y-2">
          {hospitals.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{h.name}</span>
                {(h.city || h.state) && (
                  <span className="text-xs text-gray-400">
                    · {[h.city, h.state].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
              {!h.is_active && (
                <span className="text-xs text-gray-400">inactive</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HospitalManagement;
