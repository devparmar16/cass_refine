import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const InfoForm = () => {
  const { user, completeProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    disp_name: user?.disp_name || '',
    email: user?.email || '',
    contact_num: user?.contact_num || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const updates = {};
    if (!user?.disp_name || user?.disp_name === 'NULL') updates.disp_name = form.disp_name;
    if (!user?.email || user?.email === 'NULL' || user?.email === 'EMPTY') updates.email = form.email;
    if (!user?.contact_num || user?.contact_num === 'NULL') updates.contact_num = form.contact_num;
    if (!updates.disp_name && !updates.email && !updates.contact_num) {
      setLoading(false);
      navigate(`/${user?.role?.toLowerCase().replace(/\s+/g, '')}/dashboard`);
      return;
    }
    const result = await completeProfile(updates);
    setLoading(false);
    if (result.success) {
      navigate(`/${user?.role?.toLowerCase().replace(/\s+/g, '')}/dashboard`);
    } else {
      setError('Failed to update profile. Please try again.');
    }
  };

  // Only show fields that are missing
  const showDispName = !user?.disp_name || user?.disp_name === 'NULL';
  const showEmail = !user?.email || user?.email === 'NULL' || user?.email === 'EMPTY';
  const showContact = !user?.contact_num || user?.contact_num === 'NULL';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please fill in the missing information to continue
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-white shadow-xl p-6 rounded-lg">
          {showDispName && (
            <div>
              <label htmlFor="disp_name" className="block text-sm font-medium text-gray-700">Display Name</label>
              <input
                type="text"
                name="disp_name"
                id="disp_name"
                required
                value={form.disp_name}
                onChange={handleChange}
                className="mt-1 block w-full border rounded px-3 py-2"
                placeholder="Enter your display name"
              />
            </div>
          )}
          {showEmail && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                required
                value={form.email}
                onChange={handleChange}
                className="mt-1 block w-full border rounded px-3 py-2"
                placeholder="Enter your email"
              />
            </div>
          )}
          {showContact && (
            <div>
              <label htmlFor="contact_num" className="block text-sm font-medium text-gray-700">Contact Number</label>
              <input
                type="text"
                name="contact_num"
                id="contact_num"
                required
                value={form.contact_num}
                onChange={e => {
                  // Only allow numbers and max 10 digits
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setForm(f => ({ ...f, contact_num: value }));
                }}
                className="mt-1 block w-full border rounded px-3 py-2"
                placeholder="Enter your contact number"
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]{10}"
              />
            </div>
          )}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save and Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InfoForm;