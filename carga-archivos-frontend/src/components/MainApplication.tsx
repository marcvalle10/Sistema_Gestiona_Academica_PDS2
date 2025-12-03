"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UniversityHeaderOnly, NavigationTabs } from "@/components/shared";
import {
  UserDirectory,
  FileUploadView,
  HistoricalReportView,
  ScheduleReportView,
  AttendanceReportView,
  PlanReportView,
} from "@/components/features";

type TabKey = "roles" | "historico" | "horarios" | "asistencia" | "planes";

const USER_STORAGE_KEY = "userData";

type AuthUser = {
  id: number;
  profesorId: number | null;
  email: string;
  nombre: string;
  roles?: string[];
  appRoles?: string[];
};

export function MainApplication() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("roles");
  const [currentView, setCurrentView] = useState<"directory" | "upload">(
    "directory"
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Leer usuario desde localStorage y redirigir si no hay sesión
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const stored = window.localStorage.getItem(USER_STORAGE_KEY);
      if (!stored) {
        router.push("/login");
        return;
      }

      const parsed = JSON.parse(stored) as AuthUser;
      if (!parsed || !parsed.email) {
        window.localStorage.removeItem(USER_STORAGE_KEY);
        router.push("/login");
        return;
      }

      setUser(parsed);
    } catch (error) {
      console.error("Error leyendo usuario de localStorage:", error);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(USER_STORAGE_KEY);
      }
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }, [router]);

  // 🔐 Auto logout por inactividad (3 minutos)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return; // solo si hay sesión válida

    let inactivityTimeout: ReturnType<typeof setTimeout>;

    const logout = () => {
      try {
        window.localStorage.removeItem(USER_STORAGE_KEY);
      } catch (e) {
        console.error("Error limpiando localStorage en logout:", e);
      }
      router.push("/login");
    };

    const resetTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        logout();
      }, 3 * 60 * 1000); // 3 minutos
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    // iniciar el timer cuando entra al módulo
    resetTimer();

    return () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [user, router]);

  // Solo ADMINISTRADOR puede ver la pestaña Roles
  const canViewRoles =
    !!user &&
    (user.appRoles?.some((r) => r.toUpperCase() === "ADMINISTRADOR") ||
      user.roles?.some((r) => r.toUpperCase() === "ADMINISTRADOR"));

  // ADMIN o COORDINADOR pueden ver el botón de ir al módulo de profesores
  const canAccessProfModule =
    !!user &&
    (user.appRoles?.some((r) =>
      ["ADMINISTRADOR", "COORDINADOR"].includes(r.toUpperCase())
    ) ||
      user.roles?.some((r) =>
        ["ADMINISTRADOR", "COORDINADOR"].includes(r.toUpperCase())
      ));

  // Si no puede ver Roles y la pestaña actual es "roles", mover a "historico"
  useEffect(() => {
    if (!checkingAuth && user && !canViewRoles && activeTab === "roles") {
      setActiveTab("historico");
    }
  }, [checkingAuth, user, canViewRoles, activeTab]);

  const handleTabChange = (tab: TabKey) => {
    // Bloquear navegación a Roles si no tiene permiso
    if (tab === "roles" && !canViewRoles) return;

    setActiveTab(tab);
    if (tab === "roles") {
      setCurrentView("directory");
    }
  };

  const handleHistoryClick = () => {
    setActiveTab("historico");
  };

  if (checkingAuth) {
    return (
      <div className="px-3 sm:px-6 lg:px-[80px] pt-2 bg-[#EDE9FF]">
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "linear-gradient(to bottom, #e8e4ff, #f3f0ff)" }}
        >
          <span className="text-sm text-gray-600">Validando sesión...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // Mientras el redirect a /login sucede
    return null;
  }

  return (
    <div className="px-3 sm:px-6 lg:px-[80px] pt-2 bg-[#EDE9FF]">
      <div
        className="min-h-screen"
        style={{ background: "linear-gradient(to bottom, #e8e4ff, #f3f0ff)" }}
      >
        <UniversityHeaderOnly />
        <NavigationTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          canViewRoles={canViewRoles}
          canAccessProfModule={canAccessProfModule}
        />

        {/* Main Content */}
        {activeTab === "roles" && canViewRoles && currentView === "directory" && (
          <UserDirectory />
        )}

        {activeTab === "roles" && canViewRoles && currentView === "upload" && (
          <FileUploadView onHistoryClick={handleHistoryClick} />
        )}

        {activeTab === "roles" && !canViewRoles && (
          <div className="mt-6 text-center text-sm text-gray-700">
            No tienes permisos para administrar roles en este módulo.
          </div>
        )}

        {activeTab === "historico" && <HistoricalReportView />}

        {activeTab === "horarios" && <ScheduleReportView />}
        {activeTab === "asistencia" && <AttendanceReportView />}
        {activeTab === "planes" && <PlanReportView />}
      </div>
    </div>
  );
}
