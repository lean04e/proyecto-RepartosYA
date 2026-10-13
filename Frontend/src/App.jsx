import { useEffect, useState } from 'react'
import CommercesSection from './components/CommercesSection'
import './App.css'

const THEME_STORAGE_KEY = 'repartosya-theme'

const commerceData = [
  {
    id: 1,
    name: 'Mercado Central',
    orders: 428,
    phone: '+54 11 4582 1900',
    address: 'Av. Corrientes 1842, CABA',
  },
  {
    id: 2,
    name: 'Casa del Sabor',
    orders: 376,
    phone: '+54 11 4771 8032',
    address: 'Calle Honduras 5210, CABA',
  },
  {
    id: 3,
    name: 'Verde Natural',
    orders: 312,
    phone: '+54 11 4890 2245',
    address: 'Av. Santa Fe 3268, CABA',
  },
  {
    id: 4,
    name: 'Almacen La Esquina',
    orders: 284,
    phone: '+54 11 4307 6619',
    address: 'Defensa 735, CABA',
  },
  {
    id: 5,
    name: 'Panaderia Norte',
    orders: 241,
    phone: '+54 11 4555 0921',
    address: 'Av. Cabildo 2180, CABA',
  },
  {
    id: 6,
    name: 'Punto Fresco',
    orders: 198,
    phone: '+54 11 4826 7310',
    address: 'Gorriti 4932, CABA',
  },
  {
    id: 7,
    name: 'Dulce Momento',
    orders: 164,
    phone: '+54 11 4862 5104',
    address: 'Malabia 1624, CABA',
  },
  {
    id: 8,
    name: 'Bodega del Sur',
    orders: 139,
    phone: '+54 11 4301 8827',
    address: 'Brasil 1198, CABA',
  },
  {
    id: 9,
    name: 'Comer Bien',
    orders: 116,
    phone: '+54 11 4804 6432',
    address: 'Juramento 2741, CABA',
  },
  {
    id: 10,
    name: 'Rincon Organico',
    orders: 87,
    phone: '+54 11 4788 3046',
    address: 'Arce 735, CABA',
  },
]

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'

    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="RepartosYA inicio">
          <img
            src={theme === 'dark' ? '/repartosya-logo-dark.svg' : '/repartosya-logo.svg'}
            alt="RepartosYA"
          />
        </a>
        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
          title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          <span>{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
        </button>
      </header>
      <main>
        <CommercesSection commerces={commerceData} />
      </main>
    </div>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5a8.5 8.5 0 1 0 11.7 11.7Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  )
}

export default App
