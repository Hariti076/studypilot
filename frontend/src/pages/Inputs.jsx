import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputsForm from '../components/inputs/InputsForm';
import { useStudy } from '../hooks/useStudy';
import { useToast } from '../hooks/useToast';

export default function Inputs() {
  const { profile, submitInputs, predicting } = useStudy();
  const toast = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setError('');
    try {
      await submitInputs(values);
      toast.success('Prediction ready. Generate a plan whenever you like.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong while analysing your details. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{profile ? 'Update your details' : 'Your study details'}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {profile
            ? 'Changing these re-runs your prediction and clears your current plan and task progress.'
            : "Tell us about your subjects and routine. We'll predict your performance and flag where you're at risk."}
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <InputsForm initial={profile} onSubmit={handleSubmit} loading={predicting} />
    </div>
  );
}
