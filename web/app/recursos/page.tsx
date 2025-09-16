import Link from 'next/link';

export default function RecursosPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Recursos de Catequesis
      </h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <p className="text-gray-600 mb-6">
          Aquí encontrarás los recursos de catequesis disponibles. El material se sirve desde 
          <code className="bg-gray-100 px-2 py-1 rounded text-sm mx-1">/recursos/catequesis</code>
          y incluye fichas de personajes de la Historia de la Salvación.
        </p>
        
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Material de Catequesis
            </h2>
            
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/recursos/catequesis/indice_general.html"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Índice general (catequesis)
                </Link>
                <p className="text-sm text-gray-500 ml-6">
                  Listado completo de todas las fichas de personajes disponibles
                </p>
              </li>
              
              <li>
                <Link 
                  href="/recursos/catequesis/index.html"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v0H8v0z" />
                  </svg>
                  Portada
                </Link>
                <p className="text-sm text-gray-500 ml-6">
                  Página principal del material de catequesis
                </p>
              </li>
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Información adicional
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Los recursos están organizados por personajes de la Historia de la Salvación 
                  y están diseñados para catequistas de Primera Comunión y Confirmación.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}