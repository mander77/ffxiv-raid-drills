import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTheme } from "../hooks/useTheme";
import { DarkModeIcon, LightModeIcon, PickedIcon } from "./icons";

/** The modes you can pick. System follows the computer's light or dark setting. */
const MODES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export interface ModeToggleProps {
  className?: string;
}

/** The light/dark switch in the header: a sun (light) or moon (dark) button with a menu of Light,
    Dark and System, as in shadcn/ui's dark mode guide. ThemeProvider keeps the choice. */
export function ModeToggle({ className }: ModeToggleProps) {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)}>
          <LightModeIcon aria-hidden="true" className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <DarkModeIcon aria-hidden="true" className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Light or Dark Mode</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {MODES.map((m) => (
          <DropdownMenuItem key={m.value} onClick={() => setTheme(m.value)}>
            {m.label}
            {theme === m.value && <PickedIcon aria-hidden="true" className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
