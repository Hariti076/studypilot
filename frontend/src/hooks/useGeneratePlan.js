import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudy } from './useStudy';
import { useToast } from './useToast';

/** Shared "Generate plan" action (used by the dashboard quick action and the planner page). */
export function useGeneratePlan({ navigateToPlanner = false } = {}) {
  const { createPlan, planning } = useStudy();
  const toast = useToast();
  const navigate = useNavigate();

  const generate = useCallback(async () => {
    try {
      await createPlan();
      toast.success('Your weekly study plan is ready.');
      if (navigateToPlanner) navigate('/planner');
    } catch (err) {
      toast.error(err.message || 'Could not generate your plan. Please try again.');
    }
  }, [createPlan, toast, navigate, navigateToPlanner]);

  return { generate, planning };
}
