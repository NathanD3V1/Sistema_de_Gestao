import { statusConfig, priorityConfig, teamStatusConfig } from '@/lib/utils';

interface BadgeProps {
  type: 'status' | 'priority' | 'team-status';
  value: string;
}

export function Badge({ type, value }: BadgeProps) {
  let config;

  switch (type) {
    case 'status':
      config = statusConfig[value as keyof typeof statusConfig];
      break;
    case 'priority':
      config = priorityConfig[value as keyof typeof priorityConfig];
      break;
    case 'team-status':
      config = teamStatusConfig[value as keyof typeof teamStatusConfig];
      break;
    default:
      return null;
  }

  if (!config) return null;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.color} ${config.textColor}`}>
      {config.label}
    </span>
  );
}
