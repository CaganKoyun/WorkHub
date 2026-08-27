import { Globe, Check } from 'lucide-react';
import { useT } from '@/contexts/LangContext';
import { AVAILABLE_LANGS } from '@/lib/i18n';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { lang, setLang, t } = useT();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-[12px] text-muted-foreground hover:text-foreground"
          aria-label={t('common.language')}
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="font-medium uppercase">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {AVAILABLE_LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLang(l.code)}
            className="flex items-center gap-2 text-[13px]"
          >
            <span aria-hidden>{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {lang === l.code && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
