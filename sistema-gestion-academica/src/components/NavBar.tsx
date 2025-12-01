"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import NotificationBell from "@/components/ui/NotificationBell";

// Hook personalizado para obtener la ruta actual
const useClientPathname = () => {
  const [pathname, setPathname] = useState("/");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);
  return pathname;
};

type Props = {
  className?: string;
  azul: string;
  dorado: string;
};

type UserData = {
  nombre?: string;
  email?: string;
  roles?: string[];
};

const CARGA_ARCHIVOS_URL =
  process.env.NEXT_PUBLIC_CARGA_ARCHIVOS_URL || "http://localhost:4000";

export default function NavBar({ className, azul, dorado }: Props) {
  const pathname = useClientPathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);

  const menuItems = [
    { href: "/inicio", label: "Inicio", id: "inicio" },
    {
      href: "#",
      label: "Calificaciones",
      id: "calificaciones",
      dropdown: [
        {
          href: "/calificaciones/subir-calificaciones",
          label: "Subir calificaciones vía Excel",
        },
        {
          href: "/calificaciones/consultar-calificaciones",
          label: "Consultar calificaciones",
        },
      ],
    },
    { href: "/reportes", label: "Reportes Académicos", id: "reportes" },
    { href: "/alertas-faltas", label: "Alertas por Faltas", id: "alertas" },
  ];

  // Leer usuario desde localStorage (login de profesores)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("sgi-user");
      if (!raw) {
        setUser(null);
        return;
      }
      const parsed = JSON.parse(raw) as UserData;
      setUser(parsed);
    } catch (err) {
      console.error("Error leyendo usuario en NavBar:", err);
      setUser(null);
    }
  }, []);

  const handleMenuClick = (id: string, hasDropdown: boolean) => {
    if (hasDropdown) setOpenDropdown(openDropdown === id ? null : id);
    else setOpenDropdown(null);
  };

  // Solo ADMINISTRADOR o COORDINADOR pueden ver el botón de Carga de Archivos
  const canAccessCargaArchivos =
    !!user?.roles?.some((r) =>
      ["ADMINISTRADOR", "COORDINADOR"].includes(r.toUpperCase())
    );

  const handleGoToCargaArchivos = () => {
    if (typeof window !== "undefined") {
      window.location.href = CARGA_ARCHIVOS_URL;
    }
  };

  return (
    <nav
      className={className}
      style={{ backgroundColor: dorado, borderTop: `6px solid ${azul}` }}
    >
      <div className="max-w-7xl mx-auto px-8 w-full flex justify-between items-center">
        {/* --- IZQUIERDA: MENÚ --- */}
        <ul className="flex justify-start gap-8">
          {menuItems.map((item) => {
            // @ts-ignore
            const hasDropdown = item.dropdown && item.dropdown.length > 0;
            // @ts-ignore
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/") ||
              (hasDropdown &&
                item.dropdown.some((sub: any) =>
                  pathname.startsWith(sub.href)
                ));
            const isMenuOpen = openDropdown === item.id;

            return (
              <li
                key={item.id}
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setTimeout(() => setOpenDropdown(null), 200);
                  }
                }}
                tabIndex={0}
              >
                <a
                  href={item.href}
                  onClick={(e) => {
                    if (hasDropdown) {
                      e.preventDefault();
                      handleMenuClick(item.id, true);
                    } else {
                      handleMenuClick(item.id, false);
                    }
                  }}
                  className={`px-2 py-4 block transition font-medium text-sm lg:text-base ${
                    isActive || isMenuOpen
                      ? `text-[${azul}]`
                      : "text-white hover:text-black"
                  }`}
                  style={{ color: isActive || isMenuOpen ? azul : undefined }}
                >
                  {item.label}
                </a>
                {hasDropdown && isMenuOpen && (
                  <div className="absolute top-full left-0 w-64 bg-white shadow-xl z-50 rounded-b-lg overflow-hidden border-t-0 border border-gray-200">
                    {/* @ts-ignore */}
                    {item.dropdown.map((subItem) => (
                      <Link
                        key={subItem.label}
                        href={subItem.href}
                        className={`block px-4 py-3 text-sm font-medium transition-colors ${
                          pathname === subItem.href
                            ? `bg-blue-50 text-[${azul}]`
                            : `text-gray-700 hover:bg-gray-100 hover:text-[${azul}]`
                        }`}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* --- DERECHA: BOTÓN CARGA DE ARCHIVOS + ICONOS (Notificaciones + Usuario) --- */}
        <div className="flex items-center gap-4">
          {/* Botón azul para ir a Carga de Archivos (solo ADMIN / COORDINADOR) */}
          {canAccessCargaArchivos && (
            <button
              onClick={handleGoToCargaArchivos}
              className="px-3 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              Carga de Archivos
            </button>
          )}

          {/* Campana de Alertas */}
          <NotificationBell />

          {/* Icono de Usuario */}
          <Link href="/configuracion-perfil">
            <div className="text-white hover:text-black transition cursor-pointer p-1">
              <UserCircle className="w-8 h-8" />
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
