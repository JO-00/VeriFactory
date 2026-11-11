import { useState } from "react";
import { Topbar, Sidebar, SidebarSection, NavItem } from "./Components/ui";
import FacilityList from "./Dashboards/FactoryDashboard/FacilityList";
import DAOMembersPanel from "./Dashboards/DAOMembersPanel";
import CommitteePanel from "./Dashboards/CommitteePanel";

function App() {
  const [activeView, setActiveView] = useState("facilities");

  return (
    <>
      <Topbar />
      <div className="flex min-h-[calc(100vh-56px)]">
        <Sidebar>
          <SidebarSection title="Overview">
            <NavItem
              active={activeView === "facilities"}
              onClick={() => setActiveView("facilities")}
            >
              Facilities
            </NavItem>
            <NavItem
              active={activeView === "analytics"}
              onClick={() => setActiveView("analytics")}
            >
              Analytics
            </NavItem>
            <NavItem
              active={activeView === "monitoring"}
              onClick={() => setActiveView("monitoring")}
            >
              Monitoring
            </NavItem>
          </SidebarSection>
          <SidebarSection title="Governance Hub">
            <NavItem
              active={activeView === "dao"}
              onClick={() => setActiveView("dao")}
            >
              DAO (Decentralized Autonomous Organization) Overview
            </NavItem>
            <NavItem
              active={activeView === "committee"}
              onClick={() => setActiveView("committee")}
            >
              Current Appointed Committee
            </NavItem>
            <NavItem
              active={activeView === "inspector"}
              onClick={() => setActiveView("inspector")}
            >
              Inspector Overview
            </NavItem>
          </SidebarSection>
          <SidebarSection title="Personal">
            <NavItem
              active={activeView === "notifications"}
              onClick={() => setActiveView("notifications")}
            >
              Notifications
            </NavItem>
            <NavItem
              active={activeView === "settings"}
              onClick={() => setActiveView("settings")}
            >
              Settings
            </NavItem>
          </SidebarSection>
        </Sidebar>
        <main className="flex-1 min-w-0 px-7 py-6">
          {activeView === "facilities" && <FacilityList />}
          {activeView === "analytics" && <div>Analytics view</div>}
          {activeView === "monitoring" && <div>Monitoring view</div>}
          {activeView === "dao" && <DAOMembersPanel />}
          {activeView === "committee" && <CommitteePanel />}
          {activeView === "inspector" && <div>Inspector view</div>}
          {activeView === "notifications" && <div>Notifications view</div>}
          {activeView === "settings" && <div>Settings view</div>}
        </main>
      </div>
    </>
  );
}

export default App;