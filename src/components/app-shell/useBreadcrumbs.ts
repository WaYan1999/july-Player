import { useLocation } from "react-router-dom";
import { routeTitles } from "./constants";
import { useCourseTitles } from "./CourseTitleContext";
import type { BreadcrumbItem } from "@/types";
import { useI18n } from "@/hooks/useI18n";

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const { titles } = useCourseTitles();
  const { t } = useI18n();
  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const from = searchParams.get("from");

  // Course detail: Parent > <Course title>
  const courseMatch = pathname.match(/^\/course\/(\d+)$/);
  if (courseMatch) {
    // from may include search params (e.g. "/?q=react"), extract pathname for label
    const fromPathname = from ? from.split("?")[0] : "/";
    const parentLabel = getRouteTitle(fromPathname, t) || t.nav.dashboard;
    const parentPath = from || "/";
    const courseId = Number(courseMatch[1]);
    const courseTitle = titles[courseId] ?? t.nav.courseDetails;
    return [
      { label: parentLabel, path: parentPath },
      { label: courseTitle },
    ];
  }

  // Import: Dashboard > Import Course
  if (pathname === "/import") {
    return [
      { label: t.nav.dashboard, path: "/" },
      { label: t.nav.importCourse },
    ];
  }

  // Top-level pages
  return [{ label: getRouteTitle(pathname, t) ?? t.nav.ckourse }];
}

function getRouteTitle(pathname: string, t: ReturnType<typeof useI18n>["t"]): string | undefined {
  const titles: Record<string, string> = {
    "/": t.nav.dashboard,
    "/bookmarks": t.nav.bookmarks,
    "/progress": t.nav.progress,
    "/notes": t.nav.notes,
    "/settings": t.nav.settings,
    "/import": t.nav.importCourse,
  };
  return titles[pathname] ?? routeTitles[pathname];
}
