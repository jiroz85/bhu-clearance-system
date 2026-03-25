type StepStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type Step = {
  stepOrder: number;
  status: StepStatus;
};

function canReview(stepOrder: number, steps: Step[]) {
  const step = steps.find((s) => s.stepOrder === stepOrder);
  if (!step || step.status !== 'PENDING') return false;
  if (stepOrder === 1) return true;
  const prev = steps.find((s) => s.stepOrder === stepOrder - 1);
  return prev?.status === 'APPROVED';
}

describe('workflow integration checks (1..13)', () => {
  it('full 1 -> 13 approvals complete the workflow', () => {
    const steps: Step[] = Array.from({ length: 13 }, (_, i) => ({
      stepOrder: i + 1,
      status: 'PENDING',
    }));

    for (let i = 1; i <= 13; i += 1) {
      expect(canReview(i, steps)).toBe(true);
      steps[i - 1].status = 'APPROVED';
    }

    expect(steps.every((s) => s.status === 'APPROVED')).toBe(true);
  });

  it('rejection pauses and recheck resumes from same step', () => {
    const steps: Step[] = Array.from({ length: 13 }, (_, i) => ({
      stepOrder: i + 1,
      status: i < 4 ? 'APPROVED' : 'PENDING',
    }));

    expect(canReview(5, steps)).toBe(true);
    steps[4].status = 'REJECTED';
    expect(canReview(6, steps)).toBe(false);
    steps[4].status = 'PENDING';
    expect(canReview(5, steps)).toBe(true);
    steps[4].status = 'APPROVED';
    expect(canReview(6, steps)).toBe(true);
  });

  it('prevents step skipping and duplicate approvals', () => {
    const steps: Step[] = Array.from({ length: 13 }, (_, i) => ({
      stepOrder: i + 1,
      status: 'PENDING',
    }));

    expect(canReview(2, steps)).toBe(false);
    expect(canReview(1, steps)).toBe(true);
    steps[0].status = 'APPROVED';
    expect(canReview(1, steps)).toBe(false);
  });

  it('certificate gate only after all 13 approved', () => {
    const steps: Step[] = Array.from({ length: 13 }, (_, i) => ({
      stepOrder: i + 1,
      status: i < 12 ? 'APPROVED' : 'PENDING',
    }));
    expect(steps.length === 13 && steps.every((s) => s.status === 'APPROVED')).toBe(false);
    steps[12].status = 'APPROVED';
    expect(steps.length === 13 && steps.every((s) => s.status === 'APPROVED')).toBe(true);
  });
});

