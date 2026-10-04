const PERSONA_METHODS = {
  'Consistent Attender': {
    title: 'Add timed practice to a routine that already works',
    steps: [
      'Keep the same start time you already use.',
      'Once a week, sit a timed paper for the nearest exam.',
      'The next day, redo only the questions you missed.',
    ],
  },
  'Tutoring-Supported': {
    title: 'Arrive with questions, then revise within a day',
    steps: [
      'Before any help session, write three questions you cannot answer.',
      'Revise those exact topics within 24 hours.',
      'Leave a topic only after you can explain it without notes.',
    ],
  },
  'Low Motivation': {
    title: 'Make the first session small enough to start',
    steps: [
      'Set a 25-minute timer and stop when it ends.',
      'Study at the same hour each day, even for one block.',
      'Tick the session off, then take the break you planned.',
    ],
  },
  'Irregular Attender': {
    title: 'Put class first, then a short catch-up',
    steps: [
      'Attend the class before you open a textbook.',
      'That same day, spend 20 minutes rewriting what was taught.',
      'Use the short catch-up blocks on your plan for anything you missed.',
    ],
  },
};

function examWhen(days) {
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function practiceCard(subject) {
  const examSoon = subject.daysLeft <= 14;
  return {
    id: 'practice',
    category: 'Practice',
    title: examSoon ? `Switch ${subject.name} to exam practice` : `Start each day with ${subject.name}`,
    why: `${subject.name} is your highest-priority subject. You are at ${subject.current}% now, and the model predicts ${subject.predicted}% with ${subject.risk.toLowerCase()} risk. The exam is ${examWhen(subject.daysLeft)}.`,
    steps: examSoon
      ? [
          `Sit one timed ${subject.name} paper with notes closed.`,
          'List the questions you missed before you look up answers.',
          'Spend the next session only on those missed topics.',
        ]
      : [
          `Do 15–20 minutes of ${subject.name} questions before you reread notes.`,
          'Close the book and write the idea from memory.',
          'Check what you missed, then stop. One topic is enough.',
        ],
  };
}

function methodCard(persona) {
  const method = PERSONA_METHODS[persona?.name] || PERSONA_METHODS['Irregular Attender'];
  return {
    id: 'method',
    category: 'How to study',
    title: method.title,
    why: persona?.tip || persona?.description || 'The clustering model picked a study style from your habits.',
    steps: method.steps,
  };
}

function habitCard(prediction) {
  const { profile, summary } = prediction;
  const attendance = profile.attendance;
  const sleep = profile.sleepHours;
  const hours = profile.dailyHours;

  if (attendance < 75) {
    return {
      id: 'attendance',
      category: 'Attendance',
      title: 'Raise attendance before adding more study hours',
      why: `Attendance is ${attendance}%. The models use it as a direct input, and missed classes are hard to replace with extra evening hours.`,
      steps: [
        'Sit the next class even if the last one felt confusing.',
        'The same evening, rewrite the class notes from memory.',
        'Ask one classmate for the page or example you missed.',
      ],
    };
  }

  if (sleep < 7) {
    return {
      id: 'sleep',
      category: 'Recovery',
      title: 'Protect sleep so the hours you study stay with you',
      why: `You are sleeping ${sleep} hours. The score model includes sleep, and under 7 hours makes the next day’s recall weaker.`,
      steps: [
        'Stop new topics 30 minutes before bed.',
        'Keep the same wake time, including Sunday.',
        'On a tired day, review yesterday’s notes instead of starting a new chapter.',
      ],
    };
  }

  if (profile.habits === 'Low') {
    return {
      id: 'habits',
      category: 'Routine',
      title: 'Shrink the start so a low-motivation day still happens',
      why: 'Motivation is marked Low. A shorter, fixed session beats waiting until you feel ready.',
      steps: [
        'Open only the first task on today’s plan.',
        'Work for 25 minutes, then tick it off.',
        'Add a second block only after the first one is done.',
      ],
    };
  }

  if (hours < 2) {
    return {
      id: 'hours',
      category: 'Time',
      title: 'Add one reliable hour before stretching the day',
      why: `${hours} hour${hours === 1 ? '' : 's'} a day leaves little room for the weaker subject. The plan works better with one protected block than with a longer day you skip.`,
      steps: [
        'Keep the blocks already on the weekly plan.',
        'Add 25 minutes on the highest-priority subject only.',
        'Do not add a second subject until that block is finished.',
      ],
    };
  }

  const direction = summary.avgPredicted < summary.avgCurrent ? 'a small drop unless this week is more focused' : 'room to hold or lift the average if the priority order is followed';
  return {
    id: 'steady',
    category: 'This week',
    title: 'Follow the priority order instead of studying everything equally',
    why: `Your current average is ${summary.avgCurrent}% and the model predicts ${summary.avgPredicted}%. That points to ${direction}.`,
    steps: [
      'Do the highest-priority subject while you are fresh.',
      'Tick the session as soon as you finish it.',
      'If you miss a day, do the next planned block. Do not stack two subjects to catch up.',
    ],
  };
}

/** Concrete study suggestions from the model prediction. No extra API call. */
export function buildSuggestions(prediction) {
  if (!prediction?.subjects?.length) return [];
  const ranked = [...prediction.subjects].sort((a, b) => b.priorityScore - a.priorityScore);
  const soonest = [...prediction.subjects].sort((a, b) => a.daysLeft - b.daysLeft)[0];
  const cards = [practiceCard(ranked[0]), methodCard(prediction.persona), habitCard(prediction)];

  if (soonest && soonest.name !== ranked[0].name && soonest.daysLeft <= 14) {
    cards.push({
      id: 'exam',
      category: 'Exam',
      title: `${soonest.name} needs past papers now`,
      why: `The ${soonest.name} exam is ${examWhen(soonest.daysLeft)}. Predicted score is ${soonest.predicted}% from a current ${soonest.current}%.`,
      steps: [
        `Replace one reread with a timed ${soonest.name} paper.`,
        'Mark the paper, then study only the lost marks.',
        'Leave new chapters until after that paper is reviewed.',
      ],
    });
  }

  return cards;
}
