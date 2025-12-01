"use client";

import React from "react";
import { Bentham } from "next/font/google";

// Configurar la fuente Bentham
const bentham = Bentham({
  weight: "400",
  subsets: ["latin"],
});

type TabKey = "roles" | "historico" | "horarios" | "asistencia" | "planes";

interface NavigationTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  /**
   * Si es false, no se muestra la pestaña "Gestión de Roles"
   */
  canViewRoles?: boolean;
  /**
   * Si es true, muestra el botón para ir al módulo de profesores
   * (solo ADMIN / COORDINADOR)
   */
  canAccessProfModule?: boolean;
}

const PROFESORES_URL =
  process.env.NEXT_PUBLIC_PROFESORES_URL || "http://localhost:3001";

export function NavigationTabs({
  activeTab,
  onTabChange,
  canViewRoles = false,
  canAccessProfModule = false,
}: NavigationTabsProps) {
  const handleGoToProfesores = () => {
    if (typeof window !== "undefined") {
      window.location.href = PROFESORES_URL;
    }
  };

  return (
    <div className="bg-[#E6B10F] text-white px-3 sm:px-6 shadow-sm">
      <div className="flex items-center">
        <div className="flex">
          {/* Gestión de Roles (solo ADMIN) */}
          {canViewRoles && (
            <button
              onClick={() => onTabChange("roles")}
              className={`py-3 sm:py-6 px-4 sm:px-6 text-base sm:text-xl font-normal transition-colors ${
                activeTab === "roles"
                  ? "text-[#16469B] bg-[#E6B10F]"
                  : "text-[#FFFFFF] bg-[#E6B10F] hover:bg-[#E6B10F]"
              }`}
            >
              <span className={bentham.className}>Gestión de Roles</span>
            </button>
          )}

          <button
            onClick={() => onTabChange("historico")}
            className={`py-3 sm:py-6 px-4 sm:px-6 text-base sm:text-xl font-normal transition-colors ${
              activeTab === "historico"
                ? "text-[#16469B] bg-[#E6B10F]"
                : "text-[#FFFFFF] bg-[#E6B10F] hover:bg-[#E6B10F]"
            }`}
          >
            <span className={bentham.className}>Reporte Histórico</span>
          </button>

          <button
            onClick={() => onTabChange("horarios")}
            className={`py-3 sm:py-6 px-4 sm:px-6 text-base sm:text-xl font-normal transition-colors ${
              activeTab === "horarios"
                ? "text-[#16469B] bg-[#E6B10F]"
                : "text-[#FFFFFF] bg-[#E6B10F] hover:bg-[#E6B10F]"
            }`}
          >
            <span className={bentham.className}>Horarios</span>
          </button>

          <button
            onClick={() => onTabChange("asistencia")}
            className={`py-3 sm:py-6 px-4 sm:px-6 text-base sm:text-xl font-normal transition-colors ${
              activeTab === "asistencia"
                ? "text-[#16469B] bg-[#E6B10F]"
                : "text-[#FFFFFF] bg-[#E6B10F] hover:bg-[#E6B10F]"
            }`}
          >
            <span className={bentham.className}>Grupos</span>
          </button>

          <button
            onClick={() => onTabChange("planes")}
            className={`py-3 sm:py-6 px-4 sm:px-6 text-base sm:text-xl font-normal transition-colors ${
              activeTab === "planes"
                ? "text-[#16469B] bg-[#E6B10F]"
                : "text-[#FFFFFF] bg-[#E6B10F] hover:bg-[#E6B10F]"
            }`}
          >
            <span className={bentham.className}>Planes de estudio</span>
          </button>
        </div>

        {/* Botón para ir al módulo profesores, solo ADMIN/COORD */}
        {canAccessProfModule && (
          <div className="ml-auto">
            <button
              onClick={handleGoToProfesores}
              className="ml-3 my-2 px-4 py-2 rounded-full bg-[#16469B] text-xs sm:text-sm font-medium hover:bg-[#123670] transition-colors"
            >
              <span className={bentham.className}>
                Ir al módulo Profesores
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
