import { useState } from "react";
import { Topbar, Sidebar, SidebarSection, NavItem } from "./Components/ui";
import FacilityList from "./Dashboards/FactoryDashboard/FacilityList";
import DAOMembersPanel from "./Dashboards/DAOMembersPanel";
import CommitteePanel from "./Dashboards/CommitteePanel";
import { WalletProvider } from "./Common/WalletProvider";
import InspectorView from "./Dashboards/InspectorView";
import { FacilityDashboard } from "./Dashboards/FacilityDashboard/FacilityDashboard";
import type { AuthenticationResult } from "./Dashboards/dashboard_types";

function AppContent() {
  const [activeView, setActiveView] = useState("facilities");
  const [activeDashboard, setActiveDashboard] = useState<AuthenticationResult | null>(null);


  // When a user authenticates from the InspectorView, set the active dashboard
  const handleAuthenticate = (result: AuthenticationResult) => {
    setActiveDashboard(result);
  };

  // If a dashboard is active, render it full-screen
  if (activeDashboard) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <button
          onClick={() => setActiveDashboard(null)}
          className="rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent mb-3"
        >
          ← Back to dashboard
        </button>
        <FacilityDashboard
          facilityAddress={activeDashboard.facilityAddress}
          role={activeDashboard.role}
          onClose={() => setActiveDashboard(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <Sidebar>
        <SidebarSection title="Overview">
          <NavItem active={activeView === "facilities"} onClick={() => setActiveView("facilities")}>Facilities</NavItem>
        </SidebarSection>
        <SidebarSection title="Governance Hub">
          <NavItem active={activeView === "dao"} onClick={() => setActiveView("dao")}>DAO (Decentralized Autonomous Organization) Overview</NavItem>
          <NavItem active={activeView === "committee"} onClick={() => setActiveView("committee")}>Current Appointed Committee</NavItem>
          <NavItem active={activeView === "inspector"} onClick={() => setActiveView("inspector")}>Inspector Overview</NavItem>
        </SidebarSection>
      </Sidebar>
      <main className="flex-1 min-w-0 px-7 py-6">
        {activeView === "facilities" && <FacilityList />}
        {activeView === "dao" && <DAOMembersPanel />}
        {activeView === "committee" && <CommitteePanel />}
        {activeView === "inspector" && <InspectorView onAuthenticated={handleAuthenticate} />}
      </main>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <Topbar />
      <AppContent />
    </WalletProvider>
  );
}

export default App;