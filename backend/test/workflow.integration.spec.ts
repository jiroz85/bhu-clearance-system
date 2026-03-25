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

    // Step 5 is rejected
    expect(canReview(5, steps)).toBe(true);
    steps[4].status = 'REJECTED';
    // Cannot move to step 6
    expect(canReview(6, steps)).toBe(false);

    // Recheck sets step 5 back to pending, then approve
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

    expect(canReview(2, steps)).toBe(false); // skip step 1
    expect(canReview(1, steps)).toBe(true);
    steps[0].status = 'APPROVED';
    expect(canReview(1, steps)).toBe(false); // duplicate review blocked
  });

  it('certificate gate: only after all 13 are approved', () => {
    const steps: Step[] = Array.from({ length: 13 }, (_, i) => ({
      stepOrder: i + 1,
      status: i < 12 ? 'APPROVED' : 'PENDING',
    }));
    const canGenerateBefore = steps.length === 13 && steps.every((s) => s.status === 'APPROVED');
    expect(canGenerateBefore).toBe(false);

    steps[12].status = 'APPROVED';
    const canGenerateAfter = steps.length === 13 && steps.every((s) => s.status === 'APPROVED');
    expect(canGenerateAfter).toBe(true);
  });
});

