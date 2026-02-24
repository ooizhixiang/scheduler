'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toaster';
import { Check, Calendar, Coffee, Megaphone, PartyPopper, Trash2, Plus } from 'lucide-react';

const STEPS = ['Scheduling', 'Break Rules', 'Publish Day', 'Done'] as const;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface BreakRule {
  minShiftHours: number;
  breakDurationMinutes: number;
  isPaid: boolean;
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : i === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                i <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {step}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-px w-8 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SchedulingStep({
  cadence,
  customDays,
  onCadenceChange,
  onCustomDaysChange,
}: {
  cadence: string;
  customDays: number | null;
  onCadenceChange: (v: string) => void;
  onCustomDaysChange: (v: number | null) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Scheduling Cadence</CardTitle>
        </div>
        <CardDescription>
          How often do you create schedules for your team?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {[
            { value: 'WEEKLY', label: 'Weekly', desc: 'Create a new schedule every week' },
            { value: 'BI_WEEKLY', label: 'Bi-weekly', desc: 'Create a new schedule every two weeks' },
            { value: 'CUSTOM', label: 'Custom', desc: 'Set a custom period length' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onCadenceChange(option.value)}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                cadence === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  cadence === option.value
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                }`}
              >
                {cadence === option.value && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-muted-foreground">{option.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {cadence === 'CUSTOM' && (
          <div className="space-y-2 ml-7">
            <Label>Period length (days)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={customDays || ''}
              onChange={(e) => onCustomDaysChange(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="e.g. 10"
              className="max-w-[200px]"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BreakRulesStep({
  rules,
  onRulesChange,
}: {
  rules: BreakRule[];
  onRulesChange: (rules: BreakRule[]) => void;
}) {
  const addRule = () => {
    onRulesChange([...rules, { minShiftHours: 6, breakDurationMinutes: 30, isPaid: false }]);
  };

  const removeRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof BreakRule, value: any) => {
    const updated = rules.map((rule, i) =>
      i === index ? { ...rule, [field]: value } : rule,
    );
    onRulesChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-primary" />
          <CardTitle>Break Rules</CardTitle>
        </div>
        <CardDescription>
          Set automatic break deduction rules based on shift length. These rules determine
          when breaks are applied to timesheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Coffee className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              No break rules configured yet.
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Add a rule to automatically deduct breaks from shifts over a certain length.
            </p>
            <Button variant="outline" size="sm" onClick={addRule}>
              <Plus className="h-4 w-4 mr-1" /> Add break rule
            </Button>
          </div>
        ) : (
          <>
            {rules.map((rule, i) => (
              <div key={i} className="flex items-end gap-3 rounded-lg border p-4">
                <div className="space-y-2 flex-1">
                  <Label>For shifts over (hours)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    step={0.5}
                    value={rule.minShiftHours}
                    onChange={(e) => updateRule(i, 'minShiftHours', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Break duration (minutes)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    step={5}
                    value={rule.breakDurationMinutes}
                    onChange={(e) => updateRule(i, 'breakDurationMinutes', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Paid?</Label>
                  <Select
                    value={rule.isPaid ? 'paid' : 'unpaid'}
                    onValueChange={(v) => updateRule(i, 'isPaid', v === 'paid')}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeRule(i)} className="shrink-0">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRule}>
              <Plus className="h-4 w-4 mr-1" /> Add another rule
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PublishDayStep({
  publishDay,
  onPublishDayChange,
}: {
  publishDay: number | null;
  onPublishDayChange: (day: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <CardTitle>Publish Day</CardTitle>
        </div>
        <CardDescription>
          Which day do you usually publish schedules? Your employees will see this so they
          know when to expect their schedule.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DAYS.map((day, i) => (
            <button
              key={day}
              type="button"
              onClick={() => onPublishDayChange(i)}
              className={`rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                publishDay === i
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DoneStep() {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="pt-8 pb-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-primary/10 p-4">
            <PartyPopper className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
            <p className="text-muted-foreground mt-1">
              Your business is configured and ready to go. Start by inviting your
              team members or head to the dashboard.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => router.push('/employees')}>
              Invite Employees
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const { employee } = useAuth();
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [step, setStep] = useState(0);
  const [cadence, setCadence] = useState('WEEKLY');
  const [customDays, setCustomDays] = useState<number | null>(null);
  const [breakRules, setBreakRules] = useState<BreakRule[]>([]);
  const [publishDay, setPublishDay] = useState<number | null>(null);

  // Hydrate form from existing settings
  useEffect(() => {
    if (settings) {
      setCadence(settings.schedulingCadence || 'WEEKLY');
      setCustomDays(settings.customPeriodDays || null);
      setBreakRules(
        Array.isArray(settings.breakRules) ? settings.breakRules : [],
      );
      setPublishDay(settings.publishDay ?? null);

      // If already completed setup, go to done step
      if (settings.setupComplete) {
        setStep(3);
      }
    }
  }, [settings]);

  // Only super admins can run the wizard
  if (employee && employee.systemRole !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const saveStep = async (nextStep: number) => {
    try {
      const payload: Record<string, any> = {};

      if (step === 0) {
        payload.schedulingCadence = cadence;
        payload.customPeriodDays = cadence === 'CUSTOM' ? customDays : null;
      } else if (step === 1) {
        payload.breakRules = breakRules;
      } else if (step === 2) {
        payload.publishDay = publishDay;
        payload.setupComplete = true;
      }

      await updateSettings.mutateAsync(payload);
      setStep(nextStep);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error?.message || 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Setup your business</h1>
        <p className="text-muted-foreground mt-1">
          Configure your scheduling preferences in a few quick steps.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {step === 0 && (
        <>
          <SchedulingStep
            cadence={cadence}
            customDays={customDays}
            onCadenceChange={setCadence}
            onCustomDaysChange={setCustomDays}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => saveStep(1)}
              disabled={updateSettings.isPending || (cadence === 'CUSTOM' && !customDays)}
            >
              {updateSettings.isPending ? 'Saving...' : 'Next'}
            </Button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <BreakRulesStep rules={breakRules} onRulesChange={setBreakRules} />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => saveStep(2)} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Next'}
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <PublishDayStep publishDay={publishDay} onPublishDayChange={setPublishDay} />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={() => saveStep(3)}
              disabled={updateSettings.isPending || publishDay === null}
            >
              {updateSettings.isPending ? 'Saving...' : 'Finish'}
            </Button>
          </div>
        </>
      )}

      {step === 3 && <DoneStep />}
    </div>
  );
}
