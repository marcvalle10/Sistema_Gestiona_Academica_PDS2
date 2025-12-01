'use client';

import React from 'react';
import { Pencil } from 'lucide-react';
import { AlumnoFaltas, getSemaforo } from '@/types/alertas';
import { StatusDot } from '@/components/ui/StatusDot';
import clsx from 'clsx';

type Props = {
  rows: AlumnoFaltas[];
  onJustificar?: (expediente: string) => void;
  className?: string;
};

export function AlertasTable({ rows, onJustificar, className }: Props) {
  const cols = 'grid grid-cols-[140px_minmax(320px,1fr)_120px_160px_110px]';

  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Encabezado fijo (fuera del scroll) */}
      <div className={clsx(cols, 'border-b bg-slate-100 text-slate-700')}>
        {['Expediente', 'Nombre', 'Faltas', 'Faltas Permitidas', 'Justificar'].map((th) => (
          <div
            key={th}
            className="px-4 py-3 text-sm font-semibold leading-5 whitespace-nowrap"
          >
            {th}
          </div>
        ))}
      </div>

      {/* Contenedor con scroll */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {rows.length > 0 ? (
          <div>
            {rows.map((alumno, idx) => {
              const status = getSemaforo(alumno.faltas, alumno.faltasPermitidas);
              return (
                <div
                  key={alumno.expediente + idx}
                  className={clsx(
                    cols,
                    'items-center border-b text-slate-900',
                    idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                  )}
                  style={{ minHeight: 48 }}
                >
                  <div className="px-4 py-3 text-sm tabular-nums">
                    {alumno.expediente}
                  </div>

                  <div className="px-4 py-3 text-sm truncate">
                    {alumno.nombreCompleto}
                  </div>

                  <div className="px-4 py-3 text-sm flex items-center gap-2">
                    <StatusDot status={status} />
                    {alumno.faltas}
                  </div>

                  <div className="px-4 py-3 text-sm">
                    {alumno.faltas}/{alumno.faltasPermitidas}
                  </div>

                  <div className="px-4 py-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => onJustificar?.(alumno.expediente)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-blue-600 px-2.5 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Justificar faltas de ${alumno.nombreCompleto}`}
                      title="Justificar"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            No hay registros para este grupo.
          </div>
        )}
      </div>
    </div>
  );
}
