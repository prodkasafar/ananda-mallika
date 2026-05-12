import React, { useState, Suspense, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Float, ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { Calendar, Users, MapPin, Star, ChevronRight, Home, Menu, X, CheckCircle2, Sun, Moon, LogIn, User, LogOut, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react'

// --- 3D Components ---

function MiniatureHouse({ scrollRotation }) {
  const mesh = useRef()
  useFrame((state) => { if (mesh.current) { mesh.current.rotation.y = scrollRotation.get() * Math.PI * 0.5 } })
  return (
    <group ref={mesh} scale={0.8}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}><boxGeometry args={[2, 1, 2]} /><meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.2} /></mesh>
      <mesh castShadow receiveShadow position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.8, 1.2, 4]} /><meshStandardMaterial color="#5B7E3C" roughness={0.3} /></mesh>
      <mesh position={[0.6, 0.5, 1.01]}><boxGeometry args={[0.4, 0.4, 0.05]} /><meshStandardMaterial color="#FFD65A" emissive="#FF9D23" emissiveIntensity={0.8} /></mesh>
      <mesh position={[-0.6, 0.5, 1.01]}><boxGeometry args={[0.4, 0.4, 0.05]} /><meshStandardMaterial color="#FFD65A" emissive="#FF9D23" emissiveIntensity={0.8} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow><circleGeometry args={[2.5, 32]} /><meshStandardMaterial color="#f0f9eb" /></mesh>
    </group>
  )
}

function Scene({ scrollRotation }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[4, 3, 4]} fov={45} />
      <ambientLight intensity={1.5} />
      <spotLight position={[5, 10, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
      <pointLight position={[-5, -5, -5]} intensity={1} color="#FF9D23" />
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}><MiniatureHouse scrollRotation={scrollRotation} /></Float>
      <ContactShadows position={[0, -0.01, 0]} opacity={0.2} scale={10} blur={2} far={4.5} />
      <Environment preset="park" />
    </>
  )
}

// --- Admin Dashboard Component ---

const AdminDashboard = ({ onBack, currentUser }) => {
  const [allBookings, setAllBookings] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'bookings', 'users'

  const loadData = () => {
    setAllBookings(JSON.parse(localStorage.getItem('bookings') || '[]'))
    setAllUsers(JSON.parse(localStorage.getItem('user_accounts') || '[]'))
  }

  useEffect(() => { loadData() }, [])

  const [notification, setNotification] = useState(null)
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState(null)

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleToggleRole = (email) => {
    const updatedUsers = allUsers.map(u => {
      if (u.email === email) {
        const newRole = u.role === 'Administrator' ? 'Guest' : 'Administrator'
        setNotification(`Role for ${email} updated to ${newRole}`)
        return { ...u, role: newRole }
      }
      return u
    })
    localStorage.setItem('user_accounts', JSON.stringify(updatedUsers))
    setAllUsers(updatedUsers)
  }

  const handleAdminCancel = (bookingId) => {
    const updatedBookings = allBookings.filter(b => b.id !== bookingId)
    localStorage.setItem('bookings', JSON.stringify(updatedBookings))
    setAllBookings(updatedBookings)
    setNotification('Booking cancelled successfully')
  }

  const handleDeleteUser = (email) => {
    const updatedUsers = allUsers.filter(u => u.email !== email)
    localStorage.setItem('user_accounts', JSON.stringify(updatedUsers))
    setAllUsers(updatedUsers)
    
    const currentBookings = JSON.parse(localStorage.getItem('bookings') || '[]')
    const updatedBookings = currentBookings.filter(b => b.userEmail !== email)
    localStorage.setItem('bookings', JSON.stringify(updatedBookings))
    setAllBookings(updatedBookings)
    setConfirmDeleteEmail(null)
    setNotification(`User ${email} deleted successfully`)
  }

  const tableStyle = { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '2.5rem' }
  const thStyle = { textAlign: 'left', padding: '1.2rem', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }
  const tdStyle = { padding: '1.2rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }

  const navItemStyle = (tab) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.5rem',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    background: activeTab === tab ? '#5B7E3C' : 'transparent',
    color: activeTab === tab ? 'white' : '#64748b',
    border: 'none',
    width: '100%',
    textAlign: 'left'
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'inherit' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: 'white', borderRight: '1px solid #e2e8f0', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'fixed', height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <div style={{ background: '#5B7E3C', padding: '0.5rem', borderRadius: '12px', display: 'flex' }}><ShieldCheck color="white" size={24} /></div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px', color: '#1e293b' }}>Admin Central</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <button onClick={() => setActiveTab('overview')} style={navItemStyle('overview')}>
            <Home size={20} /> Overview
          </button>
          <button onClick={() => setActiveTab('bookings')} style={navItemStyle('bookings')}>
            <Calendar size={20} /> Bookings
          </button>
          <button onClick={() => setActiveTab('users')} style={navItemStyle('users')}>
            <Users size={20} /> User Roles
          </button>
        </nav>

        <button onClick={onBack} style={{ background: '#1e293b', color: 'white', padding: '1rem', borderRadius: '12px', fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
          <LogOut size={18} /> Exit Admin
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '280px', flex: 1, padding: '3rem 4rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {notification && (
              <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '1rem 2rem', borderRadius: '12px', marginBottom: '2rem', border: '2px solid #bbf7d0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <CheckCircle2 size={20} /> {notification}
              </div>
            )}

            {activeTab === 'overview' && (
              <>
                <header style={{ marginBottom: '3rem' }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Dashboard Overview</h1>
                  <p style={{ color: '#64748b', marginTop: '0.5rem' }}>System performance and key metrics at a glance.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                  <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', borderLeft: '8px solid #5B7E3C' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>Active Bookings</p>
                        <h2 style={{ margin: '0.5rem 0 0', fontSize: '3rem', fontWeight: 800 }}>{allBookings.length}</h2>
                      </div>
                      <div style={{ background: '#f0f9eb', p: '1rem', borderRadius: '16px', color: '#5B7E3C' }}><Calendar size={32} /></div>
                    </div>
                  </div>
                  <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', borderLeft: '8px solid #FF9D23' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>Total Users</p>
                        <h2 style={{ margin: '0.5rem 0 0', fontSize: '3rem', fontWeight: 800 }}>{allUsers.length}</h2>
                      </div>
                      <div style={{ background: '#fff7ed', p: '1rem', borderRadius: '16px', color: '#FF9D23' }}><Users size={32} /></div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'bookings' && (
              <>
                <header style={{ marginBottom: '3rem' }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Reservations Management</h1>
                  <p style={{ color: '#64748b', marginTop: '0.5rem' }}>View and manage all guest stays across properties.</p>
                </header>

                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Guest Email</th>
                      <th style={thStyle}>Property</th>
                      <th style={thStyle}>Dates</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBookings.map((b, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{b.userEmail}</td>
                        <td style={tdStyle}><span style={{ fontWeight: 700, color: '#5B7E3C' }}>{b.property}</span></td>
                        <td style={tdStyle}>{b.checkIn} — {b.checkOut}</td>
                        <td style={tdStyle}>
                          <button onClick={() => handleAdminCancel(b.id)} style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fda4af', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                            Force Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {activeTab === 'users' && (
              <>
                <header style={{ marginBottom: '3rem' }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>User & Access Control</h1>
                  <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Manage system permissions and user accounts.</p>
                </header>

                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>User Name</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Current Role</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{u.name}</td>
                        <td style={tdStyle}>{u.email}</td>
                        <td style={tdStyle}>
                          <span style={{ 
                            background: u.role === 'Administrator' ? '#f0f9ff' : '#f8fafc', 
                            color: u.role === 'Administrator' ? '#0284c7' : '#64748b',
                            padding: '0.5rem 1rem',
                            borderRadius: '100px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            border: u.role === 'Administrator' ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textTransform: 'uppercase'
                          }}>
                            {u.role === 'Administrator' ? <ShieldCheck size={14} /> : <User size={14} />}
                            {u.role || 'Guest'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '0.8rem' }}>
                            {u.email !== 'admin@email.com' && (
                              <>
                                <button onClick={() => handleToggleRole(u.email)} style={{ background: 'white', border: '2px solid #5B7E3C', color: '#5B7E3C', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                                  Set as {u.role === 'Administrator' ? 'Guest' : 'Administrator'}
                                </button>
                                {confirmDeleteEmail === u.email ? (
                                  <div style={{ display: 'flex', gap: '0.4rem', background: '#fff1f2', padding: '0.4rem', borderRadius: '12px', border: '1px solid #fda4af' }}>
                                    <button onClick={() => handleDeleteUser(u.email)} style={{ background: '#EA5252', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>Delete</button>
                                    <button onClick={() => setConfirmDeleteEmail(null)} style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>Cancel</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setConfirmDeleteEmail(u.email)} style={{ background: 'none', border: '2px solid #EA5252', color: '#EA5252', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Trash2 size={16} /> Delete
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

// --- UI Components ---

const Navbar = ({ onOpenBooking, onOpenMyBookings, onOpenLogin, onOpenAdmin, onLogout, user }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const isAdmin = user?.role === 'Administrator'

  return (
    <nav className="glass" style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000, padding: '1rem 0' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div onClick={() => window.location.href = '/'} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} title="Reload Home">
          <div style={{ background: '#5B7E3C', padding: '0.5rem', borderRadius: '12px', display: 'flex' }}><Home color="white" size={24} /></div>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px', color: '#5B7E3C' }}>LuxeStay</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="#about" style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: 600 }}>Explore</a>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button onClick={onOpenAdmin} style={{ background: '#1e293b', color: 'white', padding: '0.8rem 1.2rem', borderRadius: '10px', fontWeight: 700, border: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', whiteSpace: 'nowrap' }}>
                <ShieldCheck size={18} /> Admin tools
              </button>
            )}
            <button onClick={onOpenBooking} className="btn-booking" style={{ borderRadius: '10px', whiteSpace: 'nowrap' }}>Book Now</button>
          </div>
          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#5B7E3C', fontWeight: 700, background: 'var(--surface)', border: '2px solid #5B7E3C', padding: '0.6rem 1.4rem', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <User size={20} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.95rem' }}>{user.name}</span>
                  {user.role === 'Administrator' && (
                    <span style={{ fontSize: '0.65rem', color: '#FF9D23', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Administrator
                    </span>
                  )}
                </div>
              </button>
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass" style={{ position: 'absolute', top: '120%', right: 0, minWidth: '220px', padding: '0.6rem', borderRadius: '16px', zIndex: 1001 }}>
                    <button onClick={() => { onOpenMyBookings(); setIsUserMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', color: 'var(--foreground)', fontWeight: 600, background: 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left' }}><Calendar size={18} color="#FF9D23" /> My Bookings</button>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
                    <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', color: '#EA5252', fontWeight: 700, background: 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left' }}><LogOut size={18} /> Logoff</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button onClick={onOpenLogin} className="btn-signin"><LogIn size={20} />Sign In</button>
          )}
        </div>
      </div>
    </nav>
  )
}

const Hero = ({ onOpenBooking }) => {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])
  return (
    <section className="hero" style={{ paddingTop: '180px', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      <div style={{ position: 'absolute', top: '15%', right: '5%', width: '600px', height: '600px', zIndex: 0, pointerEvents: 'none' }}>
        <Canvas shadows alpha><Suspense fallback={null}><Scene scrollRotation={scrollYProgress} /></Suspense></Canvas>
      </div>
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div style={{ opacity, scale, textAlign: 'left' }} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.2, ease: "easeOut" }}>
          <div style={{ marginBottom: '2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 2rem', borderRadius: '100px', background: 'white', border: '1px solid #5B7E3C', boxShadow: 'var(--shadow)' }}>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}><Star size={18} color="#FF9D23" fill="#FF9D23" /></motion.div>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#5B7E3C', letterSpacing: '0.5px' }}>VIBRANT FOREST STAYS</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)', marginBottom: '2rem', maxWidth: '850px', fontWeight: 800, color: 'var(--foreground)' }}>Where <span style={{ color: '#5B7E3C' }}>Nature</span> Meets <br /><span style={{ color: '#FF9D23' }}>Passion</span> & <span style={{ color: '#FFD65A' }}>Light</span>.</h1>
          <p style={{ fontSize: '1.5rem', color: '#64748b', marginBottom: '4rem', maxWidth: '650px', fontWeight: 400, lineHeight: 1.6 }}>Experience the harmony of our expanded palette. From the deep forest greens to the fiery red sunset.</p>
          <div style={{ display: 'flex', gap: '2rem' }}><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenBooking} className="btn-primary" style={{ fontSize: '1.2rem', padding: '1.2rem 3.5rem' }}>Explore Stays</motion.button></div>
        </motion.div>
      </div>
    </section>
  )
}

const LoginModal = ({ isOpen, onClose, onLogin }) => {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  useEffect(() => { if (isOpen) { setIsRegister(false); setError(''); setSuccess(''); setEmail(''); setPassword(''); } }, [isOpen])
  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const stored = localStorage.getItem('user_accounts')
      const existingUsers = stored ? JSON.parse(stored) : []
      if (isRegister) {
        if (existingUsers.some(u => u.email === email)) { setError('Account already exists. Please sign in.'); return; }
        const newUser = { name: email.split('@')[0], email, password, role: 'Guest' }
        localStorage.setItem('user_accounts', JSON.stringify([...existingUsers, newUser]))
        setSuccess('Account created successfully! Please sign in with your credentials.')
        setIsRegister(false)
        setEmail('')
        setPassword('')
      } else {
        const user = existingUsers.find(u => u.email === email && u.password === password)
        if (user) { onLogin(user); onClose(); } else { setError('Invalid credentials. Please check your email/password.'); }
      }
    } catch (err) { setError('System error. Please try again.'); }
  }
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass" style={{ width: '100%', maxWidth: '420px', padding: '3.5rem 3rem', borderRadius: '32px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800 }}>{isRegister ? 'Join Us' : 'Welcome'}</h2>
              <p style={{ color: '#64748b' }}>{isRegister ? 'Create a guest account.' : 'Sign in to access stays.'}</p>
            </div>
            {error && <div style={{ background: '#fff1f2', color: '#e11d48', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '2px solid #fda4af', textAlign: 'center' }}>{error}</div>}
            {success && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '2px solid #bbf7d0', textAlign: 'center', fontWeight: 600 }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '1.2rem', borderRadius: '16px', border: '2px solid #e2e8f0' }} required placeholder="Email Address" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '1.2rem', borderRadius: '16px', border: '2px solid #e2e8f0' }} required placeholder="Password" />
              <button type="submit" className="btn-signin" style={{ height: '60px', justifyContent: 'center' }}>{isRegister ? 'Sign Up' : 'Sign In'}</button>
            </form>
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }} style={{ width: '100%', marginTop: '2rem', background: 'none', color: '#5B7E3C', fontWeight: 700, textDecoration: 'underline' }}>{isRegister ? 'Already have an account? Sign In' : 'Need an account? Create one'}</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const BookingModal = ({ isOpen, onClose, onBookingComplete, user }) => {
  const [step, setStep] = useState(1); const [bookingData, setBookingData] = useState({ id: '', checkIn: '', checkOut: '', guests: 1, property: 'Forest Cabin', status: 'Confirmed' })
  useEffect(() => { if (isOpen) { setStep(1); setBookingData({ id: '', checkIn: '', checkOut: '', guests: 1, property: 'Forest Cabin', status: 'Confirmed' }); } }, [isOpen])
  const handleSubmit = (e) => { e.preventDefault(); if (!user) { alert("Sign in to book!"); return; } const newBooking = { ...bookingData, id: Math.random().toString(36).substr(2, 9), date: new Date().toLocaleDateString(), userEmail: user.email }; const existing = JSON.parse(localStorage.getItem('bookings') || '[]'); localStorage.setItem('bookings', JSON.stringify([...existing, newBooking])); if (onBookingComplete) onBookingComplete(); setStep(2) }
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(91, 126, 60, 0.1)', backdropFilter: 'blur(8px)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass" style={{ width: '100%', maxWidth: '500px', padding: '3rem', borderRadius: '28px', position: 'relative' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            {step === 1 ? (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Reserve Now</h2>
                <select className="glass" style={{ padding: '1.2rem', borderRadius: '14px', border: '1px solid var(--border)' }} value={bookingData.property} onChange={(e) => setBookingData({ ...bookingData, property: e.target.value })}><option>Forest Cabin</option><option>Amber Villa</option><option>Crimson Lodge</option></select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}><input type="date" className="glass" style={{ padding: '1.2rem', borderRadius: '14px' }} required onChange={(e) => setBookingData({ ...bookingData, checkIn: e.target.value })} /><input type="date" className="glass" style={{ padding: '1.2rem', borderRadius: '14px' }} required onChange={(e) => setBookingData({ ...bookingData, checkOut: e.target.value })} /></div>
                <button type="submit" className="btn-booking" style={{ height: '60px', fontSize: '1.1rem' }}>Confirm Booking</button>
              </form>
            ) : (<div style={{ textAlign: 'center', padding: '2rem 0' }}><CheckCircle2 size={80} color="#5B7E3C" style={{ marginBottom: '1.5rem' }} /><h2 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Success!</h2><button onClick={onClose} className="btn-primary" style={{ width: '100%', marginTop: '2rem' }}>Back Home</button></div>)}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const MyBookingsModal = ({ isOpen, onClose, user }) => {
  const [localBookings, setLocalBookings] = useState([]); const [confirmCancelId, setConfirmCancelId] = useState(null)
  useEffect(() => { if (isOpen) { const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]'); setLocalBookings(user ? allBookings.filter(b => b.userEmail === user.email) : []) } }, [isOpen, user])
  const handleCancel = (id) => { const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]'); const updated = allBookings.filter(b => b.id !== id); localStorage.setItem('bookings', JSON.stringify(updated)); setLocalBookings(updated.filter(b => b.userEmail === user?.email)); setConfirmCancelId(null) }
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(91, 126, 60, 0.2)', backdropFilter: 'blur(8px)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', padding: '3rem', borderRadius: '32px', position: 'relative', overflowY: 'auto' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '2rem', fontWeight: 800 }}>My Bookings</h2>
            {localBookings.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>No active bookings.</p> : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>{localBookings.map((b, i) => (
                <div key={i} className="glass" style={{ padding: '2rem', borderRadius: '20px', background: 'var(--background)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h3 style={{ fontSize: '1.4rem', color: '#5B7E3C' }}>{b.property}</h3>{confirmCancelId === b.id ? (<div style={{ display: 'flex', gap: '0.5rem' }}><button onClick={() => handleCancel(b.id)} style={{ padding: '0.4rem 0.8rem', background: '#EA5252', color: 'white', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>Confirm</button><button onClick={() => setConfirmCancelId(null)} style={{ padding: '0.4rem 0.8rem', background: '#e2e8f0', color: '#64748b', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>Back</button></div>) : (<button onClick={() => setConfirmCancelId(b.id)} className="btn-cancel" style={{ background: 'none', color: '#EA5252', border: '2px solid #EA5252', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700 }}>Cancel Booking</button>)}</div>
                  <p style={{ color: '#64748b', fontWeight: 500 }}>{b.checkIn} — {b.checkOut}</p>
                </div>))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function App() {
  const [view, setView] = useState('home'); const [user, setUser] = useState(null); const [isBookingOpen, setIsBookingOpen] = useState(false); const [isLoginOpen, setIsLoginOpen] = useState(false); const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false); const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    let currentUser = savedUser ? JSON.parse(savedUser) : null

    const existingUsers = JSON.parse(localStorage.getItem('user_accounts') || '[]')

    // Seed admin user if missing
    if (!existingUsers.some(u => u.email === 'admin@email.com')) {
      const adminUser = { name: 'Admin', email: 'admin@email.com', password: 'admin', role: 'Administrator' }
      existingUsers.push(adminUser)
      localStorage.setItem('user_accounts', JSON.stringify(existingUsers))
    }

    // Crucial: Synchronize role from user_accounts to logged-in user session
    if (currentUser) {
      const account = existingUsers.find(u => u.email === currentUser.email)
      if (account && account.role !== currentUser.role) {
        currentUser = { ...currentUser, role: account.role }
        localStorage.setItem('user', JSON.stringify(currentUser))
      }
      setUser(currentUser)
    }
  }, [])
  const handleLogin = (userData) => { setUser(userData); localStorage.setItem('user', JSON.stringify(userData)); }
  const handleLogout = () => { setUser(null); localStorage.removeItem('user'); setView('home'); }
  if (view === 'admin') return <AdminDashboard onBack={() => setView('home')} currentUser={user} />
  return (
    <div className="app">
      <Navbar onOpenBooking={() => setIsBookingOpen(true)} onOpenMyBookings={() => setIsMyBookingsOpen(true)} onOpenLogin={() => setIsLoginOpen(true)} onOpenAdmin={() => setView('admin')} onLogout={handleLogout} user={user} />
      <Hero onOpenBooking={() => setIsBookingOpen(true)} />
      <LoginModal key={`login-${isLoginOpen}`} isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLogin={handleLogin} />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} onBookingComplete={() => setRefreshKey(k => k + 1)} user={user} />
      <MyBookingsModal isOpen={isMyBookingsOpen} onClose={() => setIsMyBookingsOpen(false)} user={user} />
      <section style={{ padding: '6rem 0' }}><div className="container"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem' }}>{[{ title: "Forest Aura", icon: <Star />, color: '#5B7E3C' }, { title: "Orange Sunset", icon: <Sun />, color: '#FF9D23' }, { title: "Crimson Peak", icon: <CheckCircle2 />, color: '#EA5252' }].map((item, i) => (<motion.div key={i} whileHover={{ y: -15 }} className="glass" style={{ padding: '4rem 3rem', borderRadius: '40px', textAlign: 'center' }}><div style={{ color: item.color, marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>{item.icon}</div><h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{item.title}</h3></motion.div>))}</div></div></section>
      <footer style={{ padding: '6rem 0', textAlign: 'center', color: '#94a3b8', borderTop: '1px solid var(--border)' }}><p>© 2026 LuxeStay. Colorful Nature.</p></footer>
    </div>
  )
}

export default App
