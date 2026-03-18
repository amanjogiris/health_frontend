import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { CalendarPlusIcon } from '@phosphor-icons/react/dist/ssr/CalendarPlus';
import { ChartPieIcon } from '@phosphor-icons/react/dist/ssr/ChartPie';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

export const navIcons = {
  'buildings': BuildingsIcon,
  'calendar-blank': CalendarBlankIcon,
  'calendar-plus': CalendarPlusIcon,
  'chart-pie': ChartPieIcon,
  'clock': ClockIcon,
  'gear-six': GearSixIcon,
  'stethoscope': StethoscopeIcon,
  user: UserIcon,
  users: UsersIcon,
} as Record<string, Icon>;
