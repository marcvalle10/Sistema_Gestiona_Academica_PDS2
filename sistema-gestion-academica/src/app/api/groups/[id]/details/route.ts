import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/app/lib/db";

// Función auxiliar para formatear la hora (de 11:00:00 a 11:00)
const formatTime = (timeStr: string) => {
  if (!timeStr) return "";
  return timeStr.substring(0, 5);
};

// Función para mapear día numérico a texto
const mapDia = (dia: number) => {
  const dias = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
  return dias[dia % 7] || "";
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ⬅️ En Next 15, params viene como Promise
    const { id } = await context.params;

    // 1. Obtener datos básicos del grupo y materia
    const queryGrupo = `
      SELECT 
        g.clave_grupo,
        m.codigo as materia_codigo,
        m.nombre as materia_nombre
      FROM grupo g
      JOIN materia m ON g.materia_id = m.id
      WHERE g.id = $1
    `;
    const resGrupo = await pool.query(queryGrupo, [id]);

    if (resGrupo.rows.length === 0) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    const grupo = resGrupo.rows[0];

    // 2. Obtener horarios y aulas
    const queryHorario = `
      SELECT dia_semana, hora_inicio, hora_fin, aula
      FROM horario
      WHERE grupo_id = $1
      ORDER BY dia_semana
    `;
    const resHorario = await pool.query(queryHorario, [id]);

    // 3. Formatear string de Horario y Aula
    // Ejemplo salida: "LUN 11:00-12:00, MAR 11:00-12:00"
    let horarioStr = "";
    const aulas = new Set<string>();

    const partesHorario = resHorario.rows.map(
      (h: {
        dia_semana: number;
        hora_inicio: string;
        hora_fin: string;
        aula: string | null;
      }) => {
        if (h.aula) aulas.add(h.aula);
        return `${mapDia(h.dia_semana)} ${formatTime(h.hora_inicio)}-${formatTime(
          h.hora_fin
        )}`;
      }
    );

    horarioStr = partesHorario.join(", ");
    const aulaStr = Array.from(aulas).join(" / "); // Por si tiene varias aulas

    return NextResponse.json({
      materia: `${grupo.materia_codigo} - ${grupo.materia_nombre}`,
      grupo: `${grupo.clave_grupo}`,
      aula: aulaStr || "Sin asignar",
      horario: `Horario: ${horarioStr || "Pendiente"}`,
    });
  } catch (error) {
    console.error("Error obteniendo detalles del grupo:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
