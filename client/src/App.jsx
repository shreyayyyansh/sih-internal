import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { FEATURES } from "./config/features";
import { useAuth0 } from "@auth0/auth0-react"; 
import RoleBasedRedirect from "./auth/RoleBasedRedirect";
import Home from "./pages/Home";
import ProtectedRoute from "./auth/ProtectedRoute";
import CivicHub from "./pages/CivicHub";
import FireResult from "./pages/administration/gee/FireResult";
import DeforestationResult from "./pages/administration/gee/DeforestationResult";
import WomenSafety from "./pages/features/women";
import EnvironmentalHub from "./pages/administration/gee";
import Garbage from "./pages/features/garbage";
import NGO from "./pages/features/ngo";
import Jobs from "./pages/features/jobs";
import CoastalResult from "./pages/administration/gee/CoastalResult";
import FloodResult from "./pages/administration/gee/FloodResult";
import Deforestation from "./pages/administration/gee/Deforestation";
import Fire from "./pages/administration/gee/Fire";
import CoastalErosion from "./pages/administration/gee/CoastalErosion";
import Flood from "./pages/administration/gee/Flood";
import Pollutants from "./pages/administration/gee/Pollutants";
import SurfaceHeat from "./pages/administration/gee/SurfaceHeat";
import PollutionResult from "./pages/administration/gee/PollutionResult";
import Mission from "./pages/Mission";
import AboutUs from "./pages/AboutUs";
import Navbar from "./components/Navbar";
import GarbageFeature from "./pages/features/garbage/Garbage"
import SurfaceHeatResult from "./pages/administration/gee/SurfaceResult";
import CityAdminHub from "./pages/administration/Administration";
import WomenSafetyAdmin from "./pages/administration/women/WomenSafetyAdmin";
import WomenSafetyZoneDetails from "./pages/administration/women/WomenSafetyZoneDetails";
import WomenSafetyRoom from "./pages/administration/women/WomenSafetyRoom"

// NEW: Client Women Admin based on native code
import ClientWomenAdmin from "./pages/administration/client__women_admin/ClientWomenAdmin";
import ClientWomenZone from "./pages/administration/client__women_admin/ClientWomenZone";

import GarbageAdmin from "./pages/administration/garbage/garbage";
import GarbageReports from "./pages/reports/garbage/garbageReport";
import TrackReport from "./pages/reports/track/TrackReports";
import InfraAdmin from "./pages/administration/muncipal/infra/infra";
import WasteAdmin from "./pages/administration/muncipal/waste/waste"
import WasteStaffDashboard from "./pages/staff/waste/wasteStaff";
import InfraStaffDashboard from "./pages/staff/infra/infraStaff";
import AssignInfraTask from "./pages/administration/muncipal/infra/assignInfraTask";
import UserReportsDashboard from"./pages/reports/user/userReportDashboard";
import ComplaintsPage from "./pages/features/reports/index";
import WaterStaffDashboard from "./pages/staff/water/waterStaff";
import WaterAdmin from "./pages/administration/muncipal/water/water";
import AssignWaterTask from "./pages/administration/muncipal/water/assignWaterTask";
import ElectricityStaffDashboard from "./pages/staff/electricity/ElectricityStaff";
import ElectricityAdmin from "./pages/administration/muncipal/electricity/electricity";
import AssignElectricityTask from "./pages/administration/muncipal/electricity/assignTask";
import FireAdmin from "./pages/administration/muncipal/fire/fire";
import FireStaffDashboard from "./pages/staff/fire/fireStaff";
import AdminComplaintsMap from "./pages/administration/ComplaintsMapAdmin";
import DepartmentComplaintMap from "./pages/administration/DepartmentComplaintMap";
import CircularText from "./components/CircularText"
import SafetyReports from "./pages/administration/SafetyReports";
import CivicAnalytics from "./pages/administration/CivicAnalytics";
import GeoScopeHistory from "./pages/administration/gee/GeoScopeHistory";

import AssignTask from "./pages/administration/muncipal/waste/assignTask";
import NotificationFeed from "./components/NotificationFeed"
import KindShareHome from "./pages/features/kindshare-new/KindShareHome";
import DonorCategory from "./pages/features/kindshare-new/donor/DonorCategory";
import ReceiverCategory from "./pages/features/kindshare-new/receiver/ReceiverCategory";
import RegisterNGO from "./pages/features/kindshare-new/ngonew/RegisterNGO";
import NGOList from "./pages/features/kindshare-new/donor/NGOList";
import KindShareAdmin from "./pages/administration/KindShareAdmin";
import NGOStatus from "./pages/features/kindshare-new/ngonew/NGOStatus";
import NGOAdminDashboard from "./pages/features/kindshare-new/ngoadmin/NGOAdminDashboard";
import DonateItem from "./pages/features/kindshare-new/donor/DonateItem";
import DonationStatus from "./pages/features/kindshare-new/donor/DonationStatus";
import SelectNGO from "./pages/features/kindshare-new/ngoadmin/SelectNGO";
import MyDonations from "./pages/features/kindshare-new/donor/MyDonations";
import NGOComplaints from "./pages/features/kindshare-new/donor/NGOComplaints";
import NGOComplaintsAdmin from "./pages/features/kindshare-new/ngoadmin/NGOComplaintsAdmin";
import ReceiverNGOList from "./pages/features/kindshare-new/receiver/ReceiverNGOList";
import ReceiverDonations from "./pages/features/kindshare-new/receiver/ReceiverDonations";
import MyRequests from "./pages/features/kindshare-new/receiver/MyRequests";
function App() {
  const location = useLocation();
  const showNavbar = ["/", "/mission", "/about"].includes(location.pathname);
  const { isAuthenticated, isLoading } = useAuth0();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-900">
        <CircularText
          text="URBAN*FLOW*URBAN*FLOW*" // Repeated text looks better in a circle
          onHover="speedUp"
          spinDuration={20}
          className="custom-class text-blue-400" // Added a color to match your theme
        />
      </div>
    );
  }

  return (
    <>
      {showNavbar && <Navbar />} 
      <Routes>
        <Route
          path="/"
          element={ isAuthenticated ? <RoleBasedRedirect /> : <Home /> }
        />
        <Route path="/mission" element={<Mission />} />
        <Route path="/about" element={<AboutUs />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CivicHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notification"
          element={
            <ProtectedRoute>
              <NotificationFeed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration"
          element={
            <ProtectedRoute>
              <CityAdminHub/>
            </ProtectedRoute>
          }
        />

        {/* KindShare admin (Administration hub card) */}
        <Route path="/kindshare/admin" element={<KindShareAdmin />} />

        {/* ========= KindShare citizen pages (FEATURES.kindShare) ========= */}
        {FEATURES.kindShare && (
          <>
            <Route
              path="/kindshare"
              element={
                <ProtectedRoute>
                  <RegisterNGO />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kindshare/donor"
              element={
                <ProtectedRoute>
                  <DonorCategory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kindshare/receiver"
              element={
                <ProtectedRoute>
                  <ReceiverCategory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kindshare/register-ngo"
              element={
                <ProtectedRoute>
                  <RegisterNGO />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kindshare/donor/ngos"
              element={
                <ProtectedRoute>
                  <NGOList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/donate/:ngoId"
              element={
                <ProtectedRoute>
                  <DonateItem />
                </ProtectedRoute>
              }
            />
            <Route path="/kindshare/select-ngo" element={<SelectNGO />} />
            <Route path="/kindshare/ngo-status" element={<NGOStatus />} />
            <Route path="/kindshare/ngo-admin" element={<NGOAdminDashboard />} />
            <Route
              path="/donation-status/:id"
              element={
                <ProtectedRoute>
                  <DonationStatus />
                </ProtectedRoute>
              }
            />
            <Route path="/kindshare/my-donations" element={<MyDonations />} />
            <Route path="/kindshare/complaints/:ngoId" element={<NGOComplaints />} />
            <Route path="/kindshare/ngo-complaints" element={<NGOComplaintsAdmin />} />
            <Route path="/kindshare/receiver/ngos" element={<ReceiverNGOList />} />
            <Route path="/kindshare/receiver/donations/:ngoId" element={<ReceiverDonations />} />
            <Route path="/kindshare/receiver/my-requests" element={<MyRequests />} />
          </>
        )}

        {/* ========= SisterHood citizen page (DETACHED while FEATURES.sisterHood is false) ========= */}
        {FEATURES.sisterHood && (
          <Route
            path="/sisterhood"
            element={
              <ProtectedRoute>
                <WomenSafety />
              </ProtectedRoute>
            }
          />
        )}

        {/* SisterHood admin */}
        <Route
          path="/administration/womenSafety"
          element={
            <ProtectedRoute>
              <WomenSafetyAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/womenSafety/:geohashId"
          element={
            <ProtectedRoute>
              <WomenSafetyZoneDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/womenSafety/:geohashId/:roomId"
          element={
            <ProtectedRoute>
              <WomenSafetyRoom />
            </ProtectedRoute>
          }
        />
        {/* Client Women Admin (Native SOS Command) */}
        <Route
          path="/administration/client-women-admin"
          element={
            <ProtectedRoute>
              <ClientWomenAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/client-women-admin/:geohashId"
          element={
            <ProtectedRoute>
              <ClientWomenZone />
            </ProtectedRoute>
          }
        />

        {/* ========= StreetGig (DETACHED while FEATURES.streetGig is false) ========= */}
        {FEATURES.streetGig && (
          <Route
            path="/streetgigs"
            element={
              <ProtectedRoute>
                <Jobs />
              </ProtectedRoute>
            }
          />
        )}

        {/* AI Safety Audits (admin) */}
        <Route
          path="/administration/safety-reports"
          element={
            <ProtectedRoute>
              <SafetyReports />
            </ProtectedRoute>
          }
        />

        {/* Civic Analytics (admin) */}
        <Route
          path="/administration/civic-analytics"
          element={
            <ProtectedRoute>
              <CivicAnalytics />
            </ProtectedRoute>
          }
        />

        {/* ========= CivicConnect citizen pages (DETACHED while FEATURES.civicConnect is false) ========= */}
        {FEATURES.civicConnect && (
          <>
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ComplaintsPage/>
                </ProtectedRoute>
              }
            />
            <Route
              path="/complaint"
              element={
                <ProtectedRoute>
                  <ComplaintsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/water"
              element={
                <ProtectedRoute>
                  <ComplaintsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/me"
              element={
                <ProtectedRoute >
                  <UserReportsDashboard />
                </ProtectedRoute>
              }
            />
            {/* old garbage page */}
            {/*<Route
              path="/garbage"
              element={
                <ProtectedRoute>
                  <Garbage />
                </ProtectedRoute>
              }
            />*/}
            <Route
              path="/ecosnap/reports"
              element={
                <ProtectedRoute>
                  <GarbageReports />
                </ProtectedRoute>
              }
            />
          </>
        )}

        {/* Report tracking - shared: admin department pages link to /track/:id */}
        <Route
          path="/track/:id"
          element={
            <ProtectedRoute>
              <TrackReport />
            </ProtectedRoute>
          }
        />

        {/* CivicConnect admin */}
        <Route
          path="/administration/garbage"
          element={
            <ProtectedRoute>
              <GarbageAdmin />
            </ProtectedRoute>
          }
        />

        {/* municipal department admin */}
        <Route
          path="/administration/municipal/infrastructure"
          element={
            <ProtectedRoute >
              <InfraAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/municipal/waste"
          element={
            <ProtectedRoute >
              <WasteAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/municipal/infra"
          element={
            <ProtectedRoute >
              <InfraAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/municipal/water"
          element={
            <ProtectedRoute >
              <WaterAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/municipal/electricity"
          element={
            <ProtectedRoute>
              <ElectricityAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/municipal/fire"
          element={
            <ProtectedRoute>
              <FireAdmin />
            </ProtectedRoute>
          }
        />
        <Route path="/administration/complaints-map" element={<AdminComplaintsMap />} />
        <Route path="/admin-map/:department" element={<DepartmentComplaintMap />} />

        {/* staff */}
        <Route
          path="/staff/waste"
          element={
            <ProtectedRoute >
              <WasteStaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/infra"
          element={
            <ProtectedRoute >
              < InfraStaffDashboard/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/water"
          element={
            <ProtectedRoute >
              < WaterStaffDashboard/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/electricity"
          element={
            <ProtectedRoute>
              <ElectricityStaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/fire"
          element={
            <ProtectedRoute>
              <FireStaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* task assignment */}
        <Route
          path="/assign/waste/:geoHash"
          element={
            <ProtectedRoute >
              <AssignTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assign/infra/:geoHash"
          element={
            <ProtectedRoute >
              <AssignInfraTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assign/water/:geoHash"
          element={
            <ProtectedRoute >
              <AssignWaterTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assign/electricity/:geoHash"
          element={
            <ProtectedRoute>
              <AssignElectricityTask />
            </ProtectedRoute>
          }
        />

        {/* GeoScope (admin) */}
        <Route
          path="/administration/geoscope"
          element={
            <ProtectedRoute>
              <EnvironmentalHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/geoscope/history"
          element={
            <ProtectedRoute>
              <GeoScopeHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deforestation"
          element={
            <ProtectedRoute>
              <Deforestation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deforestation/result"
          element={
            <ProtectedRoute>
              <DeforestationResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fire"
          element={
            <ProtectedRoute>
              <Fire />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fire/result"
          element={
            <ProtectedRoute>
              <FireResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coastal-erosion"
          element={
            <ProtectedRoute>
              <CoastalErosion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coastal-erosion/result"
          element={
            <ProtectedRoute>
              <CoastalResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flood"
          element={
            <ProtectedRoute>
              <Flood />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flood/result"
          element={
            <ProtectedRoute>
              <FloodResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pollutants"
          element={
            <ProtectedRoute>
              <Pollutants />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pollutants/result"
          element={
            <ProtectedRoute>
              <PollutionResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surface-heat"
          element={
            <ProtectedRoute>
              <SurfaceHeat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surface-heat/result"
          element={
            <ProtectedRoute>
              <SurfaceHeatResult />
            </ProtectedRoute>
          }
        />

        {/* Detached citizen pages and unknown URLs go back through the role redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      
    </>

  );
}

export default App;