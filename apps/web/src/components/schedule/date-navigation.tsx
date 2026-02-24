'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateNavigationProps {
  startDate: Date;
  endDate: Date;
  onPrev?: () => void;
  onNext?: () => void;
}

export function DateNavigation({ startDate, endDate, onPrev, onNext }: DateNavigationProps) {
  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-2">
      {onPrev && (
        <Button variant="ghost" size="icon" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      <span className="text-sm font-medium">
        {formatDate(startDate)} - {formatDate(endDate)}
      </span>
      {onNext && (
        <Button variant="ghost" size="icon" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
