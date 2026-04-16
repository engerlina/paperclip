import {
  Inbox,
  CircleDot,
  Target,
  LayoutDashboard,
  DollarSign,
  History,
  Search,
  SquarePen,
  Network,
  Boxes,
  Repeat,
  Settings,
  MessageSquare,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarProjects } from "./SidebarProjects";
import { SidebarAgents } from "./SidebarAgents";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { heartbeatsApi } from "../api/heartbeats";
import { queryKeys } from "../lib/queryKeys";
import { useInboxBadge } from "../hooks/useInboxBadge";
import { Button } from "@/components/ui/button";
import { PluginSlotOutlet } from "@/plugins/slots";

export function Sidebar() {
  const { openNewIssue } = useDialog();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const inboxBadge = useInboxBadge(selectedCompanyId);
  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });
  const liveRunCount = liveRuns?.length ?? 0;

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  const pluginContext = {
    companyId: selectedCompanyId,
    companyPrefix: selectedCompany?.issuePrefix ?? null,
  };

  return (
    <aside className="w-60 h-full min-h-0 border-r border-border bg-background flex flex-col">
      {/* DISRO: Branded header */}
      <div className="flex items-center gap-2 px-4 h-12 shrink-0 border-b border-border">
        <svg width="20" height="22" viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <path d="M13.1534 29.3706L10.4453 51.7501L5 50.8129L13.1534 29.3706Z" fill="currentColor"/>
          <path d="M16.9141 28.3167L29.0127 48.4232L23.8121 50.0624L16.9141 28.3167Z" fill="currentColor"/>
          <path d="M18.5107 26.3831L37.1432 42.6573L32.7461 45.4933L18.5107 26.3831Z" fill="currentColor"/>
          <path d="M17.2734 22.6797L40.8077 33.6945L37.6006 37.4792L17.2734 22.6797Z" fill="currentColor"/>
          <path d="M17.627 21.2986L43.9999 26.0889L42.2622 30.4899L17.627 21.2986Z" fill="currentColor"/>
          <path d="M16.084 19.8784L42.9852 18.0237L42.8699 22.6576L16.084 19.8784Z" fill="currentColor"/>
          <path d="M14.5068 19.0974L39.5758 10.761L41.0939 15.2188L14.5068 19.0974Z" fill="currentColor"/>
          <path d="M11.582 18.8299L32.6237 4.7417L35.6418 8.63418L11.582 18.8299Z" fill="currentColor"/>
          <path d="M8.2959 19.6665L23.4655 1.0625L27.718 4.0479L8.2959 19.6665Z" fill="currentColor"/>
          <path d="M5.99512 21.4909L13.9636 0L19.0794 1.81649L5.99512 21.4909Z" fill="currentColor"/>
          <path d="M5.12207 22.9678L5.19158 0.474854L10.7217 0.963731L5.12207 22.9678Z" fill="currentColor"/>
          <path d="M14.9741 29.262L19.4783 51.4398L13.9287 51.7387L14.9741 29.262Z" fill="currentColor"/>
        </svg>
        <span className="text-sm font-bold text-foreground">Disro</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0"
          onClick={openSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {/* Store name subheader */}
      <div className="flex items-center gap-1 px-4 py-2 text-xs text-muted-foreground">
        {selectedCompany?.brandColor && (
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: selectedCompany.brandColor }}
          />
        )}
        <span className="truncate">{selectedCompany?.name ?? "Loading..."}</span>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-auto-hide flex flex-col gap-4 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          {/* New Issue button aligned with nav items */}
          <button
            onClick={() => openNewIssue()}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="truncate">New Issue</span>
          </button>
          <SidebarNavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} liveCount={liveRunCount} />
          <SidebarNavItem
            to="/inbox"
            label="Inbox"
            icon={Inbox}
            badge={inboxBadge.inbox}
            badgeTone={inboxBadge.failedRuns > 0 ? "danger" : "default"}
            alert={inboxBadge.failedRuns > 0}
          />
          <SidebarNavItem to="/chat" label="Agent" icon={MessageSquare} />
          <PluginSlotOutlet
            slotTypes={["sidebar"]}
            context={pluginContext}
            className="flex flex-col gap-0.5"
            itemClassName="text-[13px] font-medium"
            missingBehavior="placeholder"
          />
        </div>

        <SidebarSection label="Work">
          <SidebarNavItem to="/issues" label="Issues" icon={CircleDot} />
          <SidebarNavItem to="/routines" label="Routines" icon={Repeat} textBadge="Beta" textBadgeTone="amber" />
          <SidebarNavItem to="/goals" label="Goals" icon={Target} />
        </SidebarSection>

        <SidebarProjects />

        <SidebarAgents />

        <SidebarSection label="Company">
          <SidebarNavItem to="/org" label="Org" icon={Network} />
          <SidebarNavItem to="/skills" label="Skills" icon={Boxes} />
          <SidebarNavItem to="/costs" label="Costs" icon={DollarSign} />
          <SidebarNavItem to="/activity" label="Activity" icon={History} />
          <SidebarNavItem to="/company/settings" label="Settings" icon={Settings} />
        </SidebarSection>

        <PluginSlotOutlet
          slotTypes={["sidebarPanel"]}
          context={pluginContext}
          className="flex flex-col gap-3"
          itemClassName="rounded-lg border border-border p-3"
          missingBehavior="placeholder"
        />
      </nav>
    </aside>
  );
}
