"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { UserCircle, LogOut, User } from "lucide-react"; // Agregué iconos extra
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

// Ajustado según tu captura de pantalla
type UserData = {
  id?: number;
  profesorId?: number;
  nombre?: string;
  email?: string;
  roles?: string[];
};

const CARGA_ARCHIVOS_URL =
  process.env.NEXT_PUBLIC_CARGA_ARCHIVOS_URL || "http://localhost:4000";

export default function NavBar({ className, azul, dorado }: Props) {
  const pathname = useClientPathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Nuevo estado para el menú del usuario
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const [user, setUser] = useState<UserData | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Leer usuario desde localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("user");
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

  // Cerrar el menú de usuario si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (id: string, hasDropdown: boolean) => {
    if (hasDropdown) setOpenDropdown(openDropdown === id ? null : id);
    else setOpenDropdown(null);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      // Borrar datos de sesión
      window.localStorage.removeItem("user");
      window.localStorage.removeItem("sgi-user"); // Por si acaso quedó la vieja
      window.localStorage.removeItem("token"); // Si usas token
      
      // Redirigir al login
      window.location.href = "/";
    }
  };

  // Solo ADMINISTRADOR o COORDINADOR pueden ver el botón de Carga de Archivos
  const canAccessCargaArchivos =
    !!user?.roles &&
    Array.isArray(user.roles) &&
    user.roles.some((r) =>
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
        {/* --- IZQUIERDA: MENÚ DE NAVEGACIÓN --- */}
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

        {/* --- DERECHA: BOTONES Y PERFIL --- */}
        <div className="flex items-center gap-4">
          {/* Botón Carga de Archivos */}
          {canAccessCargaArchivos && (
            <button
              onClick={handleGoToCargaArchivos}
              className="px-3 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Carga de Archivos
            </button>
          )}

          {/* Campana de Alertas */}
          <NotificationBell />

          {/* Icono de Usuario con Menú Desplegable (Logout) */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="text-white hover:text-black transition cursor-pointer p-1 focus:outline-none flex items-center"
            >
              <UserCircle className="w-8 h-8" />
            </button>

            {/* Dropdown del Usuario */}
            {isUserMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100">
                
                {/* Nombre del usuario (opcional, visual) */}
                {user?.nombre && (
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs text-gray-500 font-semibold truncate">
                      {user.nombre}
                    </p>
                  </div>
                )}

                <Link
                  href="/configuracion-perfil"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Mi Perfil
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}