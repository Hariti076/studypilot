import { addDaysISO } from '../../utils/helpers';

/** Sample student used by the "Fill sample data" button. Dates are relative to today. */
export const sampleProfile = () => ({
  subjects: [
    { name: 'Mathematics', examDate: addDaysISO(12), score: 62, difficulty: 4 },
    { name: 'Physics', examDate: addDaysISO(18), score: 55, difficulty: 5, weakTopic: 'numericals' },
    { name: 'Chemistry', examDate: addDaysISO(24), score: 74, difficulty: 3 },
    { name: 'English', examDate: addDaysISO(30), score: 82, difficulty: 2 },
  ],
  dailyHours: 3,
  sleepHours: 6,
  habits: 'Medium',
  attendance: 74,
  parentalInvolvement: 'Medium',
  accessToResources: 'Medium',
  extracurricular: 'Yes',
  internetAccess: 'Yes',
  tutoringSessions: 1,
  teacherQuality: 'Medium',
  peerInfluence: 'Neutral',
  physicalActivity: 2,
  peakEnergy: 'Evening',
});
