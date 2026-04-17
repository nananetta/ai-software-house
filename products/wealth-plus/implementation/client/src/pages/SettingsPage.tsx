import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialSettings, useUpdateFinancialSettings } from '../hooks/useSettings';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import type { FinancialSettingsFormValues } from '../types/index';

const schema = z
  .object({
    currentAge: z
      .number({ invalid_type_error: 'Required' })
      .int()
      .min(18, 'Must be at least 18')
      .max(100, 'Must be at most 100'),
    retirementAge: z
      .number({ invalid_type_error: 'Required' })
      .int()
      .min(18, 'Must be at least 18')
      .max(100, 'Must be at most 100'),
    retirementTargetAmount: z
      .number({ invalid_type_error: 'Required' })
      .positive('Must be greater than 0'),
    expectedAnnualReturn: z
      .number({ invalid_type_error: 'Required' })
      .min(0, 'Must be 0 or more')
      .max(50, 'Must be 50 or less'),
    expectedAnnualContribution: z
      .number({ invalid_type_error: 'Required' })
      .min(0, 'Must be 0 or more'),
  })
  .refine((data) => data.retirementAge > data.currentAge, {
    message: 'Retirement age must be greater than current age',
    path: ['retirementAge'],
  });

export default function SettingsPage() {
  const { data: settings, isLoading } = useFinancialSettings();
  const updateMutation = useUpdateFinancialSettings();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinancialSettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentAge: 30,
      retirementAge: 60,
      retirementTargetAmount: 10000000,
      expectedAnnualReturn: 7,
      expectedAnnualContribution: 0,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        currentAge: settings.currentAge ?? 30,
        retirementAge: settings.retirementAge ?? 60,
        retirementTargetAmount: settings.retirementTargetAmount ?? 10000000,
        expectedAnnualReturn: settings.expectedAnnualReturn ?? 7,
        expectedAnnualContribution: settings.expectedAnnualContribution ?? 0,
      });
    }
  }, [settings, reset]);

  const onSubmit = (values: FinancialSettingsFormValues) => {
    updateMutation.mutate(
      {
        currentAge: values.currentAge,
        retirementAge: values.retirementAge,
        retirementTargetAmount: values.retirementTargetAmount,
        expectedAnnualReturn: values.expectedAnnualReturn,
        expectedAnnualContribution: values.expectedAnnualContribution,
      },
      {
        onSuccess: () => toast.success('Settings saved successfully.'),
        onError: () => toast.error('Failed to save settings. Please try again.'),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retirement Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Current Age */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Current Age
              </label>
              <Input
                type="number"
                {...register('currentAge', { valueAsNumber: true })}
                className={errors.currentAge ? 'border-red-400' : ''}
              />
              {errors.currentAge && (
                <p className="mt-1 text-xs text-red-600">{errors.currentAge.message}</p>
              )}
            </div>

            {/* Retirement Age */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Retirement Age
              </label>
              <Input
                type="number"
                {...register('retirementAge', { valueAsNumber: true })}
                className={errors.retirementAge ? 'border-red-400' : ''}
              />
              {errors.retirementAge && (
                <p className="mt-1 text-xs text-red-600">{errors.retirementAge.message}</p>
              )}
            </div>

            {/* Retirement Target Amount */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Retirement Target Amount (฿)
              </label>
              <Input
                type="number"
                {...register('retirementTargetAmount', { valueAsNumber: true })}
                className={errors.retirementTargetAmount ? 'border-red-400' : ''}
              />
              {errors.retirementTargetAmount && (
                <p className="mt-1 text-xs text-red-600">{errors.retirementTargetAmount.message}</p>
              )}
            </div>

            {/* Expected Annual Return */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Expected Annual Return (%)
              </label>
              <Input
                type="number"
                step="0.1"
                {...register('expectedAnnualReturn', { valueAsNumber: true })}
                className={errors.expectedAnnualReturn ? 'border-red-400' : ''}
              />
              {errors.expectedAnnualReturn && (
                <p className="mt-1 text-xs text-red-600">{errors.expectedAnnualReturn.message}</p>
              )}
            </div>

            {/* Expected Annual Contribution */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Expected Annual Contribution (฿){' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Input
                type="number"
                {...register('expectedAnnualContribution', { valueAsNumber: true })}
                className={errors.expectedAnnualContribution ? 'border-red-400' : ''}
              />
              {errors.expectedAnnualContribution && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.expectedAnnualContribution.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
