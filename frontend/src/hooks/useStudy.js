import { useContext } from 'react';
import { StudyContext } from '../context/StudyContext';

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used inside <StudyProvider>');
  return ctx;
}
