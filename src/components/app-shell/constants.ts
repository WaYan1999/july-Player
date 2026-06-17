import {
  SquaresFourIcon as SquaresFour,
  ChartBarIcon as ChartBar,
  BookmarkSimpleIcon as BookmarkSimple,
  NotepadIcon as Notepad,
  GearSixIcon as GearSix,
  SparkleIcon as Sparkle,
  PawPrintIcon as PawPrint,
} from "@phosphor-icons/react";
import { EASE } from "@/lib/constants";
import type { NavItem } from "@/types";

export { EASE };
export const DUR = "220ms";
export const spring = (extra = "") =>
  `${extra ? extra + " " : ""}${DUR} ${EASE}`.trim();

export const navigationItems: NavItem[] = [
  { icon: SquaresFour, key: "dashboard", label: "Dashboard", path: "/" },
  { icon: BookmarkSimple, key: "bookmarks", label: "Bookmarks", path: "/bookmarks" },
  { icon: ChartBar, key: "progress", label: "Progress", path: "/progress" },
  { icon: Notepad, key: "notes", label: "Notes", path: "/notes" },
];

export const appItems: NavItem[] = [
  { icon: Sparkle, key: "aiModule", label: "AI Module", path: "/ai" },
  { icon: GearSix, key: "settings", label: "Settings", path: "/settings" },
  { icon: PawPrint, key: "pets", label: "Pets", path: "/pets" },
];

export const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/bookmarks": "Bookmarks",
  "/progress": "Progress",
  "/notes": "Notes",
  "/settings": "Settings",
  "/pets": "Pets",
  "/ai": "AI Module",
  "/import": "Import Course",
};
