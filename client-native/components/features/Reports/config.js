// client-native/components/features/reports/config.js
import { 
  Building2, 
  Trash2, 
  Zap, 
  Droplets, 
  Activity, 
  AlertTriangle, 
  ShieldCheck 
} from "lucide-react-native"; 

export const GRIEVANCE_CONFIG = {
  id: "public-grievance-system",
  title: "CivicConnect",
  subtitle: "Public Reports Portal",
  description: "Unified reporting system for public utilities. Geo-tagged submissions are automatically routed to the relevant municipal department.",
  theme: {
    // Official Urbanflow theme tokens
    primary: "indigo",
    gradient: "from-[#020617] to-[#000000]",
    activeGradient: "from-indigo-600 to-indigo-950",
    bgAccent: "bg-white/5",
    border: "border-white/10",
    textDim: "text-zinc-400",
    textHighlight: "text-white"
  },
  icons: {
    main: ShieldCheck, 
    infra: Building2,
    waste: Trash2,
    power: Zap,
    water: Droplets,
    analysis: Activity,
    alert: AlertTriangle
  }
};