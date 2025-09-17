import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Personajes de la Historia de la Salvación - Catequesis',
  description: 'Índice general de personajes bíblicos para catequesis de confirmación',
}

export default function CatequesisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">


          {/* Título principal */}
          <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">
            PERSONAJES DE LA HISTORIA DE LA SALVACIÓN
          </h1>

          {/* Sección: Patriarcas y Orígenes */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b-2 border-blue-500">
              🌟 Patriarcas y Orígenes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CharacterCard 
                name="Adán y Eva" 
                description="Los primeros seres humanos creados por Dios"
                link="/recursos/catequesis/fichas/adan_eva.html"
              />
              <CharacterCard 
                name="Caín y Abel" 
                description="Los primeros hermanos de la humanidad"
                link="/recursos/catequesis/fichas/cain_abel.html"
              />
              <CharacterCard 
                name="Noé" 
                description="El hombre justo salvado del diluvio"
                link="/recursos/catequesis/fichas/noe.html"
              />
              <CharacterCard 
                name="Abraham" 
                description="El padre de la fe y de las naciones"
                link="/recursos/catequesis/fichas/abraham.html"
              />
              <CharacterCard 
                name="Isaac" 
                description="El hijo de la promesa"
                link="/recursos/catequesis/fichas/isaac.html"
              />
              <CharacterCard 
                name="Jacob" 
                description="El patriarca que luchó con Dios"
                link="/recursos/catequesis/fichas/jacob.html"
              />
            </div>
          </section>

          {/* Sección: Líderes y Libertadores */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b-2 border-blue-500">
              ⚔️ Líderes y Libertadores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CharacterCard 
                name="José (Patriarca)" 
                description="El soñador que salvó a Egipto"
                link="/recursos/catequesis/fichas/jose_patriarca.html"
              />
              <CharacterCard 
                name="Moisés" 
                description="El libertador del pueblo de Israel"
                link="/recursos/catequesis/fichas/moises_patriarca.html"
              />
              <CharacterCard 
                name="Aarón" 
                description="El primer sumo sacerdote"
                link="/recursos/catequesis/fichas/aaron.html"
              />
              <CharacterCard 
                name="Josué" 
                description="El conquistador de la Tierra Prometida"
                link="/recursos/catequesis/fichas/josue.html"
              />
              <CharacterCard 
                name="Gedeón" 
                description="El juez valiente"
                link="/recursos/catequesis/fichas/gedeon.html"
              />
              <CharacterCard 
                name="Sansón" 
                description="El hombre de fuerza sobrenatural"
                link="/recursos/catequesis/fichas/sanson.html"
              />
            </div>
          </section>

          {/* Sección: Reyes y Gobernantes */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b-2 border-blue-500">
              👑 Reyes y Gobernantes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CharacterCard 
                name="Samuel" 
                description="El último juez y profeta"
                link="/recursos/catequesis/fichas/samuel.html"
              />
              <CharacterCard 
                name="Saúl" 
                description="El primer rey de Israel"
                link="/recursos/catequesis/fichas/saul.html"
              />
              <CharacterCard 
                name="David" 
                description="El rey según el corazón de Dios"
                link="/recursos/catequesis/fichas/david.html"
              />
              <CharacterCard 
                name="Salomón" 
                description="El rey sabio"
                link="/recursos/catequesis/fichas/salomon.html"
              />
              <CharacterCard 
                name="Nehemías" 
                description="El reconstructor de Jerusalén"
                link="/recursos/catequesis/fichas/nehemias.html"
              />
            </div>
          </section>

          {/* Sección: Profetas */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b-2 border-blue-500">
              📜 Profetas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CharacterCard 
                name="Elías" 
                description="El profeta del fuego"
                link="/recursos/catequesis/fichas/elias.html"
              />
              <CharacterCard 
                name="Eliseo" 
                description="El sucesor de Elías"
                link="/recursos/catequesis/fichas/eliseo.html"
              />
              <CharacterCard 
                name="Isaías" 
                description="El profeta del Emmanuel"
                link="/recursos/catequesis/fichas/isaias.html"
              />
              <CharacterCard 
                name="Jeremías" 
                description="El profeta de las lágrimas"
                link="/recursos/catequesis/fichas/jeremias.html"
              />
              <CharacterCard 
                name="Ezequiel" 
                description="El profeta de las visiones"
                link="/recursos/catequesis/fichas/ezequiel.html"
              />
              <CharacterCard 
                name="Daniel" 
                description="El profeta en el exilio"
                link="/recursos/catequesis/fichas/daniel.html"
              />
              <CharacterCard 
                name="Jonás" 
                description="El profeta reacio"
                link="/recursos/catequesis/fichas/jonas.html"
              />
              <CharacterCard 
                name="Zacarías" 
                description="El profeta de la esperanza"
                link="/recursos/catequesis/fichas/zacarias.html"
              />
            </div>
          </section>

          {/* Sección: Mujeres de Fe */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b-2 border-blue-500">
              🌹 Mujeres de Fe
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CharacterCard 
                name="Miriam" 
                description="La hermana de Moisés"
                link="/recursos/catequesis/fichas/miriam.html"
              />
              <CharacterCard 
                name="Débora" 
                description="La jueza y profetisa"
                link="/recursos/catequesis/fichas/debora.html"
              />
              <CharacterCard 
                name="Rut" 
                description="La mujer leal"
                link="/recursos/catequesis/fichas/rut.html"
              />
              <CharacterCard 
                name="Ester" 
                description="La reina valiente"
                link="/recursos/catequesis/fichas/ester.html"
              />
              <CharacterCard 
                name="Isabel" 
                description="La madre de Juan el Bautista"
                link="/recursos/catequesis/fichas/isabel.html"
              />
            </div>
          </section>

          {/* Sección: Nuevo Testamento */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b-2 border-blue-500">
              ✨ Nuevo Testamento
            </h2>
            
            {/* Subsección: Jesús */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">🕊️ Jesús - Momentos Clave</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CharacterCard 
                  name="Jesús - Nacimiento" 
                  description="La Encarnación del Hijo de Dios"
                  link="/recursos/catequesis/fichas/jesus_nacimiento.html"
                />
                <CharacterCard 
                  name="Jesús - Bautismo" 
                  description="El inicio de su ministerio público"
                  link="/recursos/catequesis/fichas/jesus_bautismo.html"
                />
                <CharacterCard 
                  name="Jesús - Tentaciones" 
                  description="La victoria sobre el mal"
                  link="/recursos/catequesis/fichas/jesus_tentaciones.html"
                />
                <CharacterCard 
                  name="Jesús - Sermón del Monte" 
                  description="Las Bienaventuranzas"
                  link="/recursos/catequesis/fichas/jesus_sermon_monte.html"
                />
                <CharacterCard 
                  name="Jesús - Milagros" 
                  description="Señales del Reino de Dios"
                  link="/recursos/catequesis/fichas/jesus_milagros.html"
                />
                <CharacterCard 
                  name="Jesús - Transfiguración" 
                  description="La revelación de su gloria"
                  link="/recursos/catequesis/fichas/jesus_transfiguracion.html"
                />
                <CharacterCard 
                  name="Jesús - Entrada en Jerusalén" 
                  description="El Rey humilde"
                  link="/recursos/catequesis/fichas/jesus_entrada_jerusalen.html"
                />
                <CharacterCard 
                  name="Jesús - Última Cena" 
                  description="La institución de la Eucaristía"
                  link="/recursos/catequesis/fichas/jesus_ultima_cena.html"
                />
                <CharacterCard 
                  name="Jesús - Pasión y Muerte" 
                  description="El sacrificio redentor"
                  link="/recursos/catequesis/fichas/jesus_pasion_muerte.html"
                />
                <CharacterCard 
                  name="Jesús - Resurrección" 
                  description="La victoria sobre la muerte"
                  link="/recursos/catequesis/fichas/jesus_resurreccion.html"
                />
                <CharacterCard 
                  name="Jesús - Ascensión" 
                  description="El retorno al Padre"
                  link="/recursos/catequesis/fichas/jesus_ascension.html"
                />
              </div>
            </div>

            {/* Subsección: Otros personajes del NT */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">👥 Otros Personajes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CharacterCard 
                  name="María" 
                  description="La Madre de Jesús"
                  link="/recursos/catequesis/fichas/maria.html"
                />
                <CharacterCard 
                  name="José" 
                  description="El padre adoptivo de Jesús"
                  link="/recursos/catequesis/fichas/jose.html"
                />
                <CharacterCard 
                  name="Juan el Bautista" 
                  description="El precursor del Mesías"
                  link="/recursos/catequesis/fichas/juan_bautista.html"
                />
                <CharacterCard 
                  name="Pedro" 
                  description="El primer Papa"
                  link="/recursos/catequesis/fichas/pedro.html"
                />
                <CharacterCard 
                  name="Juan" 
                  description="El discípulo amado"
                  link="/recursos/catequesis/fichas/juan.html"
                />
                <CharacterCard 
                  name="Santiago" 
                  description="El hermano de Juan"
                  link="/recursos/catequesis/fichas/santiago.html"
                />
                <CharacterCard 
                  name="Pablo" 
                  description="El apóstol de los gentiles"
                  link="/recursos/catequesis/fichas/pablo.html"
                />
                <CharacterCard 
                  name="Esteban" 
                  description="El primer mártir"
                  link="/recursos/catequesis/fichas/esteban.html"
                />
                <CharacterCard 
                  name="María Magdalena" 
                  description="La primera testigo de la Resurrección"
                  link="/recursos/catequesis/fichas/maria_magdalena.html"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

interface CharacterCardProps {
  name: string
  description: string
  link: string
}

function CharacterCard({ name, description, link }: CharacterCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full min-h-[200px]">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2 character-name">{name}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      </div>
      <div className="mt-auto">
        <a 
          href={link}
          className="block w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors text-center"
        >
          Ver ficha →
        </a>
      </div>
    </div>
  )
}