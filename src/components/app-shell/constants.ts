import {
  SquaresFourIcon as SquaresFour,
  ChartBarIcon as ChartBar,
  BookmarkSimpleIcon as BookmarkSimple,
  NotepadIcon as Notepad,
  GearSixIcon as GearSix,
} from "@phosphor-icons/react";
import { EASE } from "@/lib/constants";
import type { NavItem } from "@/types";

export { EASE };
export const DUR = "500ms";
export const spring = (extra = "") =>
  `${extra ? extra + " " : ""}${DUR} ${EASE}`.trim();

export const navigationItems: NavItem[] = [
  { icon: SquaresFour, key: "dashboard", label: "Dashboard", path: "/" },
  { icon: BookmarkSimple, key: "bookmarks", label: "Bookmarks", path: "/bookmarks" },
  { icon: ChartBar, key: "progress", label: "Progress", path: "/progress" },
  { icon: Notepad, key: "notes", label: "Notes", path: "/notes" },
];

export const appItems: NavItem[] = [
  { icon: GearSix, key: "settings", label: "Settings", path: "/settings" },
];

export const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/bookmarks": "Bookmarks",
  "/progress": "Progress",
  "/notes": "Notes",
  "/settings": "Settings",
  "/import": "Import Course",
};
