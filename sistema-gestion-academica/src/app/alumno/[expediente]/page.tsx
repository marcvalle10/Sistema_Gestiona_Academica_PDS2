'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';

interface AcademicRecord {
  semester: string;
  subject: string;
  grade: number;
  status: 'Aprobada' | 'Reprobada';
}

interface StudentData {
  name: string;
  expediente: string;
  currentGroup: string;
  email: string;
  records: AcademicRecord[];
}

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="h-64 bg-gray-200 rounded"></div>
  </div>
);

const COLORS = ['#00C49F', '#FF8042'];

const ALUMNOS_FRONTEND_URL = process.env.NEXT_PUBLIC_ALUMNOS_URL || 'http://localhost:3001';

// --- Tooltip Personalizado ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg z-50">
        <p className="font-bold text-gray-800 text-sm mb-1">{data.subject}</p>
        <div className="text-xs text-gray-600 space-y-1">
            <p>Calificación: <span className="font-semibold text-gray-900">{data.grade}</span></p>
            <p>Semestre: {data.semester}</p>
            <p className={`font-semibold ${data.status === 'Reprobada' ? 'text-red-600' : 'text-green-600'}`}>
                {data.status}
            </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const expedienteParam = Array.isArray(params?.expediente) ? params.expediente[0] : params?.expediente;

  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!expedienteParam) {
        setError('Número de expediente no válido');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/students/${expedienteParam}`);
        if (!res.ok) throw new Error('Alumno no encontrado');

        const data = await res.json() as StudentData;
        setStudentData(data);

      } catch (err: any) {
        setError(err.message || 'No se pudo cargar la información del alumno.');
        setStudentData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, [expedienteParam]);

  const handleOpenStudentView = () => {
    if (!studentData) return;
    const targetUrl = `${ALUMNOS_FRONTEND_URL}/kardex?expediente=${studentData.expediente}`;
    window.open(targetUrl, "_blank");
  };

  const getFilteredData = () => {
    if (!studentData) return [];
    return selectedSemester === 'all'
      ? studentData.records
      : studentData.records.filter(record => record.semester === selectedSemester);
  };

  const getFailedSubjects = () => {
    const data = getFilteredData();
    return data.filter(record => record.status === 'Reprobada');
  };

  const calculateAverage = () => {
    const filtered = getFilteredData();
    if (!filtered.length) return 0;
    const sum = filtered.reduce((acc, record) => acc + record.grade, 0);
    return parseFloat((sum / filtered.length).toFixed(2));
  };

  const countByStatus = () => {
    const filtered = getFilteredData();
    const approved = filtered.filter(r => r.status === 'Aprobada').length;
    const failed = filtered.length - approved;
    return [
      { name: 'Aprobadas', value: approved },
      { name: 'Reprobadas', value: failed },
    ];
  };

  const getUniqueSemesters = () => {
    if (!studentData) return ['all'];
    const semesters = [...new Set(studentData.records.map(r => r.semester))];
    return ['all', ...semesters];
  };

  const isAllSemesters = selectedSemester === 'all';

  if (isLoading) return <div className="min-h-screen bg-gray-50 p-6"><SkeletonLoader /></div>;

  if (error || !studentData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/calificaciones/consultar-calificaciones')}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
          >
            Volver a la Búsqueda
          </button>
        </div>
      </div>
    );
  }

  const failedSubjectsList = getFailedSubjects();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Encabezado */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{studentData.name}</h1>
            <p className="text-lg text-gray-600">Expediente: {studentData.expediente}</p>
            <p className="text-md text-gray-500">Grupo: {studentData.currentGroup} | Correo: {studentData.email}</p>
          </div>
          
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <Link 
                href="/calificaciones/consultar-calificaciones" 
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition text-center"
            >
                ← Nueva Búsqueda
            </Link>
            
            <button
                onClick={handleOpenStudentView}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md transition shadow-sm flex items-center justify-center gap-2"
            >
                <span>Consultar Vista de Alumno</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </button>
          </div>
        </div>

        {/* Filtro */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Semestre</label>
          <select
            id="semester"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          >
            {getUniqueSemesters().map(sem => (
              <option key={sem} value={sem}>
                {sem === 'all' ? 'Todos los Semestres' : sem}
              </option>
            ))}
          </select>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-6 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-blue-800">Promedio General</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{calculateAverage()}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-green-800">Materias Aprobadas</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{countByStatus()[0]?.value || 0}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-red-800">Materias Reprobadas</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">{countByStatus()[1]?.value || 0}</p>
          </div>
        </div>

        {/* Alerta Reprobadas */}
        {failedSubjectsList.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg shadow-sm">
            <h3 className="text-red-800 font-bold text-lg mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Atención: Materias Reprobadas Detectadas
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-1">
              {failedSubjectsList.map((subject, idx) => (
                <li key={idx} className="text-red-700">
                  <span className="font-semibold">{subject.subject}</span> 
                  <span className="text-sm text-red-600 ml-2">
                    (Semestre: {subject.semester} - Calificación: {subject.grade})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 gap-8"> 
            
            {/* 1. Gráfica de Barras */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Calificaciones por Materia</h2>
                
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                          data={getFilteredData()}
                          margin={{ top: 20, right: 10, left: 0, bottom: 40 }} 
                      >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="subject" 
                            interval={0}
                            tick={{fontSize: 10, fill: '#6B7280'}} 
                            angle={-45} 
                            textAnchor="end" 
                            height={40} 
                            dy={5}
                            tickFormatter={(val) => val.length > 7 ? `${val.substring(0, 7)}...` : val}
                          /> 
                          <YAxis domain={[0, 100]} width={40} tickLine={false} axisLine={false} /> 
                          
                          {/* Tooltip personalizado que SIEMPRE muestra la info real */}
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />

                          {/* AQUÍ ESTÁ EL FIX: 
                             minPointSize={10} obliga a que la barra tenga altura aunque el valor sea 0.
                             Esto hace que el mouse pueda "tocar" la barra y mostrar el tooltip.
                          */}
                          <Bar 
                            dataKey="grade" 
                            radius={[4, 4, 0, 0]} 
                            minPointSize={10} 
                          >
                            {getFilteredData().map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.status === 'Reprobada' ? '#EF4444' : '#3B82F6'} 
                              />
                            ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Gráfica de Pastel */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Distribución de Materias</h2>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={countByStatus()}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              outerRadius={60} 
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                          >
                              {countByStatus().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                      </PieChart>
                  </ResponsiveContainer>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}