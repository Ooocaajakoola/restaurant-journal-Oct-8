import { useUiStore } from '../../store/uiStore';
import { IconButton } from './Button';
import { Icon } from './Icon';

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const toggle = useUiStore((s) => s.toggleTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <IconButton label={`Switch to ${next} theme`} onClick={toggle}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </IconButton>
  );
}
