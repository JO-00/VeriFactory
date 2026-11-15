// config.ts
export const loadContracts = () => Promise.all([
  import("../../vite_frontend/src/HashGraphUtils/Contracts/Facility/FacilityRead"),
  import("../../vite_frontend/src/HashGraphUtils/Contracts/Facility/FacilityWrite"),
  import("../../vite_frontend/src/HashGraphUtils/Contracts/Factory/FactoryRead"),
  import("../../vite_frontend/src/HashGraphUtils/Contracts/Factory/FactoryWrite"),
  import("../../vite_frontend/src/HashGraphUtils/helper")
]);